import { type Bullet, type Entry, type ResumeDoc, type ResumeLetter, type ResumeStyle, type Section } from './doc';

// What the AI beside the résumé changed, one record per change, kept so the person can undo any
// one of them later, not only the last. Each record says how to put things back; putting back
// checks the page still says what the AI left there, so an undo never overwrites words the person
// typed since (it says so instead). Used by the résumé agent on the server and by the editor.

export type Kind = 'section' | 'entry' | 'bullet';
export type Field = 'name' | 'title' | 'heading' | 'subtitle' | 'place' | 'start' | 'end' | 'text';

/** A field on the page: the name or title line, or one field of a section, entry or bullet. */
export type Ref = { id: string | null; field: Field };

export type Change =
  | { op: 'text'; ref: Ref; before: string; after: string }
  | { op: 'added'; kind: Kind; id: string }
  | { op: 'removed'; kind: Kind; parent: string | null; index: number; value: Section | Entry | Bullet }
  | { op: 'moved'; kind: Kind; id: string; from: number; to: number }
  | { op: 'style'; before: Partial<ResumeStyle>; after: Partial<ResumeStyle> }
  | { op: 'letter'; before: ResumeLetter; after: ResumeLetter };

/** Everything the assistant can change: the résumé, how it's set, and its cover letter. */
export type Page = { doc: ResumeDoc; style: ResumeStyle; letter: ResumeLetter };

/** One change as the thread shows it, under the reply that made it. */
export type ResumeReceipt = { note: string; dashed: false; change: Change; version: string | null };

export type Found =
  | { kind: 'section'; section: Section; index: number; parent: null }
  | { kind: 'entry'; section: Section; entry: Entry; index: number; parent: string }
  | { kind: 'bullet'; section: Section; entry: Entry; bullet: Bullet; index: number; parent: string };

/** Where an id is on the page: a section, an entry, or a bullet. */
export function find(doc: ResumeDoc, id: string): Found | null {
  for (const [si, section] of doc.sections.entries()) {
    if (section.id === id) return { kind: 'section', section, index: si, parent: null };
    for (const [ei, entry] of section.entries.entries()) {
      if (entry.id === id) return { kind: 'entry', section, entry, index: ei, parent: section.id };
      const bi = entry.bullets.findIndex((b) => b.id === id);
      if (bi >= 0) return { kind: 'bullet', section, entry, bullet: entry.bullets[bi]!, index: bi, parent: entry.id };
    }
  }
  return null;
}

const ENTRY_FIELDS = new Set<Field>(['title', 'subtitle', 'place', 'start', 'end', 'text']);

/** The words in a field, or null when the field isn't there. */
export function getText(doc: ResumeDoc, ref: Ref): string | null {
  if (ref.id === null) return ref.field === 'name' || ref.field === 'title' ? doc[ref.field] : null;
  const at = find(doc, ref.id);
  if (!at) return null;
  if (at.kind === 'section') return ref.field === 'heading' ? at.section.heading : null;
  if (at.kind === 'bullet') return ref.field === 'text' ? at.bullet.text : null;
  return ENTRY_FIELDS.has(ref.field) ? at.entry[ref.field as keyof Entry & Field] : null;
}

const mapSections = (doc: ResumeDoc, f: (s: Section) => Section): ResumeDoc => ({ ...doc, sections: doc.sections.map(f) });
const mapEntries = (doc: ResumeDoc, f: (e: Entry) => Entry): ResumeDoc => mapSections(doc, (s) => ({ ...s, entries: s.entries.map(f) }));

/** The doc with one field's words replaced (unchanged if the field isn't there). */
export function setText(doc: ResumeDoc, ref: Ref, text: string): ResumeDoc {
  if (ref.id === null) return ref.field === 'name' || ref.field === 'title' ? { ...doc, [ref.field]: text } : doc;
  const id = ref.id;
  const at = find(doc, id);
  if (!at) return doc;
  if (at.kind === 'section') return mapSections(doc, (s) => (s.id === id ? { ...s, heading: text } : s));
  if (at.kind === 'bullet') return mapEntries(doc, (e) => ({ ...e, bullets: e.bullets.map((b) => (b.id === id ? { ...b, text } : b)) }));
  return mapEntries(doc, (e) => (e.id === id ? { ...e, [ref.field]: text } : e));
}

/** The doc without one section, entry or bullet. */
export function removeId(doc: ResumeDoc, id: string): ResumeDoc {
  return {
    ...doc,
    sections: doc.sections
      .filter((s) => s.id !== id)
      .map((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id).map((e) => ({ ...e, bullets: e.bullets.filter((b) => b.id !== id) })) })),
  };
}

const placed = <T>(list: T[], item: T, index: number) => {
  const next = [...list];
  next.splice(Math.max(0, Math.min(index, next.length)), 0, item);
  return next;
};

/** The doc with a section, entry or bullet put in at `index` under its parent. */
export function insertAt(doc: ResumeDoc, kind: Kind, parent: string | null, index: number, value: Section | Entry | Bullet): ResumeDoc | null {
  if (kind === 'section') return { ...doc, sections: placed(doc.sections, value as Section, index) };
  if (!parent || !find(doc, parent)) return null;
  if (kind === 'entry') return mapSections(doc, (s) => (s.id === parent ? { ...s, entries: placed(s.entries, value as Entry, index) } : s));
  return mapEntries(doc, (e) => (e.id === parent ? { ...e, bullets: placed(e.bullets, value as Bullet, index) } : e));
}

/** The doc with a section, entry or bullet moved to `to` among its siblings. */
export function moveTo(doc: ResumeDoc, id: string, to: number): ResumeDoc {
  const at = find(doc, id);
  if (!at) return doc;
  const item = at.kind === 'section' ? at.section : at.kind === 'entry' ? at.entry : at.bullet;
  const without = removeId(doc, id);
  return insertAt(without, at.kind, at.parent, to, item) ?? doc;
}

export type Reverted = Page | { error: string };

/** Puts one change back, if the page still shows what the change left. */
export function revert(page: Page, change: Change): Reverted {
  const { doc, style, letter } = page;
  const ok = (next: Partial<Page>): Page => ({ doc, style, letter, ...next });
  switch (change.op) {
    case 'text': {
      const now = getText(doc, change.ref);
      if (now === null) return { error: 'That part of the page is gone now.' };
      if (now !== change.after) return { error: 'You’ve changed those words since, so they stay as you wrote them.' };
      return ok({ doc: setText(doc, change.ref, change.before) });
    }
    case 'added':
      return ok({ doc: find(doc, change.id) ? removeId(doc, change.id) : doc });
    case 'removed': {
      if (find(doc, change.value.id)) return ok({});
      const next = insertAt(doc, change.kind, change.parent, change.index, change.value);
      return next ? ok({ doc: next }) : { error: 'Where it was is gone now, so it can’t go back.' };
    }
    case 'moved': {
      if (!find(doc, change.id)) return { error: 'That part of the page is gone now.' };
      return ok({ doc: moveTo(doc, change.id, change.from) });
    }
    case 'style': {
      const back: Partial<ResumeStyle> = {};
      for (const [k, v] of Object.entries(change.before) as [keyof ResumeStyle, never][]) {
        if (style[k] === change.after[k]) back[k] = v;
      }
      return ok({ style: { ...style, ...back } });
    }
    case 'letter':
      if (JSON.stringify(letter) !== JSON.stringify(change.after)) return { error: 'You’ve changed the letter since, so it stays as you wrote it.' };
      return ok({ letter: change.before });
  }
}

/**
 * Where a change shows on the page, as the editor's field ids ("blt_x:b", "ent_x:title",
 * "sec_x:h", "title") or the id of a whole section, entry or bullet, to mark it until looked at.
 */
export function touched(change: Change): string[] {
  if (change.op === 'text') {
    const { id, field } = change.ref;
    if (!id) return [field];
    if (field === 'heading') return [`${id}:h`];
    if (id.startsWith('blt_')) return [`${id}:b`];
    return [`${id}:${field}`];
  }
  if (change.op === 'added' || change.op === 'moved') return [change.id];
  if (change.op === 'letter') {
    const { before, after } = change;
    return after.paragraphs.filter((x) => !before.paragraphs.some((b) => b.id === x.id && b.text === x.text)).map((x) => `${x.id}:p`);
  }
  return [];
}
