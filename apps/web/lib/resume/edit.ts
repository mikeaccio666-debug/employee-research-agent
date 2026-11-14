import { emptyEntry, emptySection, MAX, newId, type Contact, type Entry, type ResumeDoc, type Section, type SectionKind } from './doc';

// Changes to a résumé version, each returning a new doc and leaving the old one as it was, so the
// editor can keep the old ones for undo. The editor uses them for every keystroke and drag; the AI
// beside it will use the same ones, so whatever it changes can be shown and undone the same way.

type Patch<T> = Partial<Omit<T, 'id'>>;

const move = <T>(list: T[], from: number, to: number): T[] => {
  if (from < 0 || from >= list.length) return list;
  const target = Math.max(0, Math.min(list.length - 1, to));
  if (from === target) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item!);
  return next;
};

export const setHeader = (doc: ResumeDoc, patch: Partial<Pick<ResumeDoc, 'name' | 'title'>>): ResumeDoc => ({ ...doc, ...patch });

export const setContact = (doc: ResumeDoc, id: string, patch: Patch<Contact>): ResumeDoc => ({
  ...doc,
  contacts: doc.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
});

export const addContact = (doc: ResumeDoc, kind: Contact['kind']): [ResumeDoc, string] => {
  if (doc.contacts.length >= MAX.contacts) return [doc, ''];
  const id = newId('con');
  return [{ ...doc, contacts: [...doc.contacts, { id, kind, value: '', hidden: false }] }, id];
};

export const removeContact = (doc: ResumeDoc, id: string): ResumeDoc => ({ ...doc, contacts: doc.contacts.filter((c) => c.id !== id) });

const mapSection = (doc: ResumeDoc, sid: string, f: (s: Section) => Section): ResumeDoc => ({
  ...doc,
  sections: doc.sections.map((s) => (s.id === sid ? f(s) : s)),
});

export const setSection = (doc: ResumeDoc, sid: string, patch: Patch<Section>) => mapSection(doc, sid, (s) => ({ ...s, ...patch }));

export const moveSection = (doc: ResumeDoc, sid: string, delta: number): ResumeDoc => {
  const i = doc.sections.findIndex((s) => s.id === sid);
  return { ...doc, sections: move(doc.sections, i, i + delta) };
};

export const addSection = (doc: ResumeDoc, kind: SectionKind): [ResumeDoc, string] => {
  if (doc.sections.length >= MAX.sections) return [doc, ''];
  const s = emptySection(kind);
  return [{ ...doc, sections: [...doc.sections, s] }, s.id];
};

export const removeSection = (doc: ResumeDoc, sid: string): ResumeDoc => ({ ...doc, sections: doc.sections.filter((s) => s.id !== sid) });

const mapEntry = (doc: ResumeDoc, sid: string, eid: string, f: (e: Entry) => Entry) =>
  mapSection(doc, sid, (s) => ({ ...s, entries: s.entries.map((e) => (e.id === eid ? f(e) : e)) }));

export const setEntry = (doc: ResumeDoc, sid: string, eid: string, patch: Patch<Entry>) => mapEntry(doc, sid, eid, (e) => ({ ...e, ...patch }));

export const addEntry = (doc: ResumeDoc, sid: string): [ResumeDoc, string] => {
  const e = emptyEntry();
  const s = doc.sections.find((x) => x.id === sid);
  if (!s || s.entries.length >= MAX.entries) return [doc, ''];
  // Experience, projects and the like start with one empty bullet to type into.
  if (s.kind !== 'summary' && s.kind !== 'skills' && s.kind !== 'education' && s.kind !== 'certifications') e.bullets = [{ id: newId('blt'), text: '' }];
  return [mapSection(doc, sid, (x) => ({ ...x, entries: [...x.entries, e] })), e.id];
};

export const removeEntry = (doc: ResumeDoc, sid: string, eid: string) => mapSection(doc, sid, (s) => ({ ...s, entries: s.entries.filter((e) => e.id !== eid) }));

export const moveEntry = (doc: ResumeDoc, sid: string, eid: string, to: number) =>
  mapSection(doc, sid, (s) => ({ ...s, entries: move(s.entries, s.entries.findIndex((e) => e.id === eid), to) }));

export const setBullet = (doc: ResumeDoc, sid: string, eid: string, bid: string, text: string) =>
  mapEntry(doc, sid, eid, (e) => ({ ...e, bullets: e.bullets.map((b) => (b.id === bid ? { ...b, text } : b)) }));

/** A new empty bullet after `after` (or at the end); returns its id, or '' when the entry is full. */
export const addBullet = (doc: ResumeDoc, sid: string, eid: string, after?: string): [ResumeDoc, string] => {
  const entry = doc.sections.find((s) => s.id === sid)?.entries.find((e) => e.id === eid);
  if (!entry || entry.bullets.length >= MAX.bullets) return [doc, ''];
  const id = newId('blt');
  const at = after ? entry.bullets.findIndex((b) => b.id === after) + 1 : entry.bullets.length;
  const bullets = [...entry.bullets];
  bullets.splice(at <= 0 ? bullets.length : at, 0, { id, text: '' });
  return [mapEntry(doc, sid, eid, (e) => ({ ...e, bullets })), id];
};

export const removeBullet = (doc: ResumeDoc, sid: string, eid: string, bid: string) =>
  mapEntry(doc, sid, eid, (e) => ({ ...e, bullets: e.bullets.filter((b) => b.id !== bid) }));

export const moveBullet = (doc: ResumeDoc, sid: string, eid: string, bid: string, to: number) =>
  mapEntry(doc, sid, eid, (e) => ({ ...e, bullets: move(e.bullets, e.bullets.findIndex((b) => b.id === bid), to) }));
