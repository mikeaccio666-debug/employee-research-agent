import { z } from 'zod';
import { visibleClaims, type Claim, type Spec } from '@/lib/portrait/spec';

// A traditional résumé the person edits themselves (PRD COACH-12): the
// page in the résumé editor, one version per row of `resumes`. Unlike the portrait, every word
// here is the person's to change; a new version starts from the confirmed lines of their portrait
// so nothing unconfirmed slips in, and later the AI beside it may reword but not add facts.
//
// One uniform shape for every section keeps the editor, the preview and the PDF on the same
// model: an entry has a heading line (title | subtitle | place, dates on the right), an optional
// line of text, and bullets. Each section kind decides which of those it shows.

export const MAX = {
  name: 80,
  versionName: 60,
  title: 120,
  contact: 120,
  contacts: 8,
  heading: 60,
  field: 120,
  date: 30,
  text: 1200,
  bullet: 500,
  bullets: 20,
  entries: 30,
  sections: 16,
  versions: 20,
} as const;

export const SECTION_KINDS = ['summary', 'education', 'experience', 'projects', 'skills', 'certifications', 'custom'] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

/** What a new section of each kind is called, and what its fields mean to the person. */
export const SECTION_INFO: Record<SectionKind, { heading: string; add: string; title: string; subtitle: string; text: string }> = {
  summary: { heading: 'Professional Summary', add: 'Add summary', title: '', subtitle: '', text: 'A few lines on who you are and what you do' },
  education: { heading: 'Education', add: 'Add school', title: 'School', subtitle: 'Degree, field', text: 'Honours, coursework' },
  experience: { heading: 'Work Experience', add: 'Add experience', title: 'Company', subtitle: 'Role', text: 'Brief summary of your role' },
  projects: { heading: 'Projects', add: 'Add project', title: 'Project', subtitle: 'What it is', text: 'Brief summary' },
  skills: { heading: 'Skills', add: 'Add skill group', title: 'Group', subtitle: '', text: 'Skills, separated by commas' },
  certifications: { heading: 'Certifications & Achievements', add: 'Add certification', title: 'Name', subtitle: 'Issued by', text: '' },
  custom: { heading: 'Other', add: 'Add entry', title: 'Title', subtitle: 'Subtitle', text: 'Details' },
};

/** Sections whose entries have a heading line and bullets; the others are text only. */
export const hasHeadLine = (k: SectionKind) => k !== 'summary' && k !== 'skills';

const id = z.string().regex(/^[a-z]{1,4}_[a-z0-9]{4,20}$/);
const str = (max: number) => z.string().max(max).default('');

const Contact = z.object({
  id,
  kind: z.enum(['email', 'phone', 'location', 'link']),
  value: str(MAX.contact),
  /** Kept in the version but left off the page (the eye toggle). */
  hidden: z.boolean().default(false),
});
export type Contact = z.infer<typeof Contact>;

const Bullet = z.object({ id, text: str(MAX.bullet) });
export type Bullet = z.infer<typeof Bullet>;

const Entry = z.object({
  id,
  title: str(MAX.field),
  subtitle: str(MAX.field),
  place: str(MAX.field),
  start: str(MAX.date),
  end: str(MAX.date),
  text: str(MAX.text),
  bullets: z.array(Bullet).max(MAX.bullets).default([]),
});
export type Entry = z.infer<typeof Entry>;

const Section = z.object({
  id,
  kind: z.enum(SECTION_KINDS),
  heading: str(MAX.heading),
  hidden: z.boolean().default(false),
  entries: z.array(Entry).max(MAX.entries).default([]),
});
export type Section = z.infer<typeof Section>;

export const ResumeDoc = z.object({
  name: str(MAX.name),
  title: str(MAX.title),
  contacts: z.array(Contact).max(MAX.contacts).default([]),
  sections: z.array(Section).max(MAX.sections).default([]),
});
export type ResumeDoc = z.infer<typeof ResumeDoc>;

/**
 * The cover letter that goes with a version: set in the same font under the same name and
 * contact line, so the two read as a pair. Paragraphs are edited one by one, like bullets.
 */
export const LETTER_MAX = { to: 300, date: 40, greeting: 120, paragraph: 1500, paragraphs: 8, closing: 80 } as const;
const Paragraph = z.object({ id, text: str(LETTER_MAX.paragraph) });
export const ResumeLetter = z.object({
  /** Who it's to, one line each: "Hiring team", "Acme Corp". */
  to: str(LETTER_MAX.to),
  date: str(LETTER_MAX.date),
  greeting: str(LETTER_MAX.greeting),
  paragraphs: z.array(Paragraph).max(LETTER_MAX.paragraphs).default([]),
  closing: str(LETTER_MAX.closing),
});
export type ResumeLetter = z.infer<typeof ResumeLetter>;

export const emptyLetter = (): ResumeLetter => ({ to: '', date: '', greeting: 'Dear hiring team,', paragraphs: [{ id: newId('par'), text: '' }], closing: 'Sincerely,' });

/** The stored letter, or a fresh one if there is none yet. */
export function readLetter(raw: unknown): ResumeLetter {
  const parsed = ResumeLetter.safeParse(raw);
  return parsed.success && (parsed.data.greeting || parsed.data.paragraphs.length) ? parsed.data : emptyLetter();
}

/** Whether a letter has anything in it beyond the defaults. */
export const letterWritten = (l: ResumeLetter) => !!(l.to.trim() || l.paragraphs.some((x) => x.text.trim()));

/** The letter as plain text, in reading order. */
export function letterText(doc: ResumeDoc, l: ResumeLetter): string {
  return [doc.name, shownContacts(doc).map((c) => c.value).join(' | '), '', l.date, l.to, '', l.greeting, ...l.paragraphs.map((x) => x.text).filter((t) => t.trim()), '', l.closing, doc.name]
    .filter((x, i, all) => x !== '' || all[i - 1] !== '')
    .join('\n')
    .trim();
}

/**
 * Fonts a résumé may use. Arial, Calibri, Times and Georgia can't be embedded in a PDF we hand
 * out, so each is stood in for by an open font drawn to the same widths (lib/resume/fonts).
 */
export const FONTS = {
  arimo: { label: 'Arimo (Arial)', css: "'Resume Arimo', Arial, sans-serif" },
  carlito: { label: 'Carlito (Calibri)', css: "'Resume Carlito', Calibri, sans-serif" },
  atkinson: { label: 'Atkinson Hyperlegible', css: "'Resume Atkinson', sans-serif" },
  tinos: { label: 'Tinos (Times)', css: "'Resume Tinos', 'Times New Roman', serif" },
  gelasio: { label: 'Gelasio (Georgia)', css: "'Resume Gelasio', Georgia, serif" },
} as const;
export type FontId = keyof typeof FONTS;
export const FONT_IDS = Object.keys(FONTS) as FontId[];

/** Single-column only: both read in order by an applicant tracking system. */
export const TEMPLATES = {
  standard: { label: 'Standard' },
  compact: { label: 'Compact' },
} as const;
export type TemplateId = keyof typeof TEMPLATES;

export const SIZE = { min: 9, max: 12, step: 0.5 } as const;
/** Fit to one page never sets type smaller than this; past it, the page says what to cut. */
export const FIT_FLOOR = 9;

export const ResumeStyle = z.object({
  template: z.enum(['standard', 'compact']).default('standard'),
  font: z.enum(FONT_IDS as [FontId, ...FontId[]]).default('arimo'),
  size: z.number().min(SIZE.min).max(SIZE.max).default(10.5),
  align: z.enum(['left', 'justify']).default('left'),
  paper: z.enum(['letter', 'a4']).default('letter'),
  fitOnePage: z.boolean().default(true),
});
export type ResumeStyle = z.infer<typeof ResumeStyle>;

export const defaultStyle = (): ResumeStyle => ResumeStyle.parse({});

/** Page sizes in points, and the margin all round. */
export const PAPER = { letter: { width: 612, height: 792 }, a4: { width: 595.28, height: 841.89 } } as const;
export const MARGIN = { standard: 50, compact: 40 } as const;

/**
 * The type size and spacing a page is set in. With fit to one page on, `scale` shrinks both until
 * the page fits (worked out by whoever lays the page out, by measuring), never below FIT_FLOOR.
 */
export function metrics(style: ResumeStyle, scale = 1) {
  const size = Math.max(Math.min(style.size * scale, style.size), Math.min(FIT_FLOOR, style.size));
  const k = size / style.size;
  const compact = style.template === 'compact';
  return {
    size,
    lead: size * (compact ? 1.25 : 1.32),
    name: size * (compact ? 1.9 : 2.1),
    heading: size * (compact ? 1.0 : 1.08),
    /** Space above a section heading, and between entries. */
    sectionGap: (compact ? 7 : 11) * k,
    entryGap: (compact ? 3 : 5) * k,
    margin: MARGIN[style.template],
  };
}

/** The smallest scale fit-to-one-page may use for a style. */
export const minScale = (style: ResumeStyle) => Math.min(1, FIT_FLOOR / style.size);

export const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 12).padEnd(8, '0')}`;

export const emptyEntry = (): Entry => ({ id: newId('ent'), title: '', subtitle: '', place: '', start: '', end: '', text: '', bullets: [] });

export const emptySection = (kind: SectionKind): Section => ({
  id: newId('sec'),
  kind,
  heading: SECTION_INFO[kind].heading,
  hidden: false,
  entries: kind === 'summary' ? [emptyEntry()] : [],
});

/** "May 2026 – Aug 2026", "2025 – Present", or one date. */
export const dates = (e: Pick<Entry, 'start' | 'end'>) => [e.start.trim(), e.end.trim()].filter(Boolean).join(' – ');

/** The stored doc, or an empty one if it's missing or malformed. */
export function readDoc(raw: unknown): ResumeDoc {
  const parsed = ResumeDoc.safeParse(raw);
  return parsed.success ? parsed.data : ResumeDoc.parse({});
}

export function readStyle(raw: unknown): ResumeStyle {
  const parsed = ResumeStyle.safeParse(raw ?? {});
  return parsed.success ? parsed.data : defaultStyle();
}

/** The sections and entries that go on the page: hidden ones and empty ones stay off. */
export function shown(doc: ResumeDoc) {
  return doc.sections
    .filter((s) => !s.hidden)
    .map((s) => ({ ...s, entries: s.entries.filter((e) => e.title || e.subtitle || e.text || e.bullets.some((b) => b.text.trim())) }))
    .filter((s) => s.entries.length > 0);
}

export const shownContacts = (doc: ResumeDoc) => doc.contacts.filter((c) => !c.hidden && c.value.trim());

/** The page as plain text, in reading order: what the PDF holds and what an ATS should read back. */
export function docText(doc: ResumeDoc): string {
  const out: string[] = [doc.name, doc.title, shownContacts(doc).map((c) => c.value).join(' | ')].filter(Boolean);
  for (const s of shown(doc)) {
    out.push('', s.heading.toUpperCase());
    for (const e of s.entries) {
      if (s.kind === 'skills') out.push([e.title, e.text].filter(Boolean).join(': '));
      else if (s.kind === 'summary') out.push(e.text);
      else {
        const head = [e.title, e.subtitle, e.place].filter(Boolean).join(' | ');
        const when = dates(e);
        if (head || when) out.push([head, when].filter(Boolean).join('    '));
        if (e.text) out.push(e.text);
      }
      for (const b of e.bullets) if (b.text.trim()) out.push(`• ${b.text}`);
    }
  }
  return out.join('\n');
}

const PROJECT = /^(project|side_project|hackathon|portfolio|open_source)$/;
const EDUCATION = /^(school|education|degree|university|college|major|course)$/;

/** "2025 — now" → start "2025", end "Present". */
function splitWhen(when: string | null): { start: string; end: string } {
  if (!when) return { start: '', end: '' };
  const [a, b] = when.split(/\s*[—–-]\s*|\s+to\s+/);
  const end = b?.trim() ?? '';
  return { start: (a ?? '').trim().slice(0, MAX.date), end: (/^(now|present|today|current)$/i.test(end) ? 'Present' : end).slice(0, MAX.date) };
}

/**
 * A first version from the portrait: only confirmed lines, in the person's own words. Experience
 * lines that share a role and organisation become one entry with several bullets; skills become
 * one group; education lines (identity lines about school) go under Education.
 */
export function docFromPortrait(spec: Spec, who: { name: string; email: string | null; link: string | null }): ResumeDoc {
  const confirmed = visibleClaims(spec);
  const h = spec.headline;
  const headline = h && h.status === 'confirmed' && h.claims.every((cid) => confirmed.some((c) => c.id === cid)) ? h.text : '';

  // Lines about one organisation become one entry with several bullets, unless their dates say
  // they were different stints. The portrait's "title" is often what the line is about ("Team
  // management"), so the first one stands as the role and the rest only add bullets.
  const entriesFor = (claims: Claim[]): Entry[] => {
    const out: Entry[] = [];
    const byKey = new Map<string, Entry[]>();
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    for (const c of claims) {
      const key = c.org ? `org:${norm(c.org)}` : c.title ? `title:${norm(c.title)}` : null;
      const when = splitWhen(c.when);
      const same = key ? byKey.get(key)?.find((e) => !when.start || !e.start || (e.start === when.start && e.end === when.end)) : undefined;
      if (same) {
        if (same.bullets.length < MAX.bullets) same.bullets.push({ id: newId('blt'), text: c.statement.slice(0, MAX.bullet) });
        if (!same.start && when.start) Object.assign(same, when);
        continue;
      }
      const entry: Entry = {
        ...emptyEntry(),
        // On a résumé the organisation leads and the role follows ("Sample Harbor Lab | Data Analyst Intern").
        title: (c.org ?? c.title ?? '').slice(0, MAX.field),
        subtitle: (c.org ? (c.title ?? '') : '').slice(0, MAX.field),
        ...splitWhen(c.when),
        bullets: [{ id: newId('blt'), text: c.statement.slice(0, MAX.bullet) }],
      };
      out.push(entry);
      if (key) byKey.set(key, [...(byKey.get(key) ?? []), entry]);
    }
    return out.slice(0, MAX.entries);
  };

  const experience = confirmed.filter((c) => c.layer === 'experience');
  const work = experience.filter((c) => !PROJECT.test(c.kind) && !EDUCATION.test(c.kind));
  const projects = experience.filter((c) => PROJECT.test(c.kind));
  const school = confirmed.filter((c) => (c.layer === 'identity' || c.layer === 'experience') && EDUCATION.test(c.kind));
  // Capability lines that name a skill ("SQL", "Python and dbt") go in the Skills list; ones that
  // tell what was done with it are sentences, so they become bullets under Highlights.
  const capability = confirmed.filter((c) => c.layer === 'capability').map((c) => c.statement.trim().replace(/[.。]+$/, ''));
  const isName = (s: string) => s.split(/\s+/).length <= 5 && !/[.。;；]/.test(s);
  const skills = capability.filter(isName);
  const highlights = capability.filter((s) => !isName(s));
  const story = confirmed.filter((c) => c.layer === 'narrative').map((c) => c.statement);

  const section = (kind: SectionKind, entries: Entry[]): Section => ({ ...emptySection(kind), entries });
  const summaryText = [headline, ...story].filter(Boolean).join(' ').slice(0, MAX.text);

  return {
    name: who.name.slice(0, MAX.name),
    title: (spec.preferences.roles[0] ?? '').slice(0, MAX.title),
    contacts: [
      who.email ? { id: newId('con'), kind: 'email', value: who.email.slice(0, MAX.contact), hidden: false } : null,
      who.link ? { id: newId('con'), kind: 'link', value: who.link.slice(0, MAX.contact), hidden: false } : null,
      { id: newId('con'), kind: 'phone', value: '', hidden: false },
      { id: newId('con'), kind: 'location', value: (spec.preferences.locations[0] ?? '').slice(0, MAX.contact), hidden: false },
    ].filter((c): c is Contact => c !== null),
    sections: [
      section('summary', [{ ...emptyEntry(), text: summaryText }]),
      section('education', entriesFor(school)),
      section('experience', entriesFor(work)),
      section('projects', entriesFor(projects)),
      ...(highlights.length
        ? [{ ...section('custom', [{ ...emptyEntry(), bullets: highlights.slice(0, MAX.bullets).map((text) => ({ id: newId('blt'), text: `${text.slice(0, MAX.bullet - 1)}.` })) }]), heading: 'Highlights' }]
        : []),
      section('skills', skills.length ? [{ ...emptyEntry(), title: 'Skills', text: skills.join(', ').slice(0, MAX.text) }] : []),
      section('certifications', []),
    ],
  };
}

/** Lin Zhou's résumé, for previews without an account (the example person of the other boards). */
export function exampleDoc(): ResumeDoc {
  const b = (text: string) => ({ id: newId('blt'), text });
  const e = (x: Partial<Entry>): Entry => ({ ...emptyEntry(), ...x });
  return {
    name: 'Lin Zhou',
    title: 'Data Analyst',
    contacts: [
      { id: newId('con'), kind: 'location', value: 'Portland, OR', hidden: false },
      { id: newId('con'), kind: 'email', value: 'lin@example.com', hidden: false },
      { id: newId('con'), kind: 'phone', value: '(555) 555-0142', hidden: true },
      { id: newId('con'), kind: 'link', value: 'github.com/linzhou', hidden: false },
    ],
    sections: [
      { ...emptySection('summary'), entries: [e({ text: 'Junior analyst focused on SQL reporting, dashboard QA and clear documentation.' })] },
      {
        ...emptySection('education'),
        entries: [e({ title: 'Example Coast University', subtitle: 'B.S., Statistics', start: 'Sep 2022', end: 'May 2026' })],
      },
      {
        ...emptySection('experience'),
        entries: [
          e({
            title: 'Sample Harbor Lab',
            subtitle: 'Data Analyst Intern',
            place: 'Portland, OR',
            start: 'Jun 2025',
            end: 'Aug 2025',
            bullets: [b('Built and checked weekly metrics from event data for three product teams.'), b('Documented query definitions and reviewed dashboard accessibility.')],
          }),
        ],
      },
      { ...emptySection('projects'), entries: [] },
      { ...emptySection('skills'), entries: [e({ title: 'Skills', text: 'SQL, Python, data visualization, data quality, spreadsheet modeling' })] },
      { ...emptySection('certifications'), entries: [] },
    ],
  };
}
