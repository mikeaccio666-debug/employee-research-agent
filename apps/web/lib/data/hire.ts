// The company side of the canvas: Northwind's brief for a summer intern and the
// contact sheet it matches (V2-S05, S06, S07, S01b company, S13b). Fixture data from
// the boards' DCLogic. Everyone here is fictional.

export type Mark = 'y' | 'h' | 'n';

/** How the contact sheet reads a must-have mark (its legend: yes · partly · not yet). */
export const MARK_LABEL: Record<Mark, string> = { y: 'yes', h: 'partly', n: 'not yet' };

export const brief = {
  /** Short name used in breadcrumbs and labels. */
  role: 'SWE Intern, Summer 2027',
  title: 'Software Engineering Intern, Summer 2027',
  pitch:
    'In twelve weeks, ship the supplier re-order screen that 40 restaurants open every morning — and own it end to end.',
  company: 'Northwind · seed · 6 people · SF two days a week, or remote',
  /** People who match the basics, and how many of them are strong matches. */
  basics: 124,
  strong: 18,
  /** Strong matches once M4 (the 10–3 overlap) is a nice-to-have. */
  relaxedStrong: 27,
} as const;

export type MustKey = 'M1' | 'M2' | 'M3' | 'M4' | 'M5';

export type MustHave = {
  k: MustKey;
  /** As written in the brief. */
  t: string;
  /** Why it is a must-have (S05). */
  why: string;
  /** Handwritten note beside the line (S05). */
  note: string;
  /** Short name for screen-reader labels on the contact sheet (S06). */
  short: string;
  /** How a candidate page names it (S07). */
  match: string;
};

export const mustHaves: MustHave[] = [
  {
    k: 'M1',
    t: 'Has shipped something real people use',
    why: 'They’ll own a screen restaurants open at 6 a.m.',
    note: 'edited just now',
    short: 'Shipped to users',
    match: 'Shipped something people use',
  },
  {
    k: 'M2',
    t: 'Comfortable in TypeScript',
    why: 'It’s our frontend and API; no time to learn a language.',
    note: '',
    short: 'TypeScript',
    match: 'Comfortable in TypeScript',
  },
  {
    k: 'M3',
    t: 'Available June–August 2027',
    why: 'Mentorship is planned around those 12 weeks.',
    note: '',
    short: 'June–August 2027',
    match: 'Free June–August 2027',
  },
  {
    k: 'M4',
    t: 'Overlaps 10 a.m.–3 p.m. Pacific',
    why: 'Pairing happens then.',
    note: '',
    short: 'Overlaps 10–3 PT',
    match: 'Overlaps 10–3 Pacific',
  },
  {
    k: 'M5',
    t: 'Writes clearly',
    why: 'Six people, async; decisions live in docs.',
    note: '',
    short: 'Writes clearly',
    match: 'Writes clearly',
  },
];

export type SheetFrame = {
  id: string;
  /** Frame number on the contact sheet: "08A". */
  no: string;
  alias: string;
  ctx: string;
  line: string;
  /** One mark per must-have, M1–M5. */
  m: Mark[];
  interest: string;
  avail: string;
  /** Three reasons, each with a source. */
  reasons: [string, string, string];
  /** Finishes "Ask in a coffee chat: …". */
  ask: string;
};

export const sheetFrames: SheetFrame[] = [
  {
    id: 'a',
    no: '07A',
    alias: 'night-heron',
    ctx: 'Career switcher · self-taught',
    line: 'Built an accessible form library three nonprofits use.',
    m: ['y', 'y', 'y', 'h', 'y'],
    interest: 'open to chats',
    avail: 'Jun 2027',
    reasons: [
      'The form library has three production users, with issue threads to show it.',
      'TypeScript in every repo since 2024.',
      'New York: overlaps your pairing window 10–2 Pacific, not until 3.',
    ],
    ask: 'how would they split a feature into pieces they can ship alone?',
  },
  {
    id: 'b',
    no: '08A',
    alias: 'quiet-otter',
    ctx: 'CS · Junior',
    line: 'Kept a 2,000-student app up through move-in week.',
    m: ['y', 'y', 'y', 'y', 'y'],
    interest: 'follows Northwind',
    avail: 'Jun 2027',
    reasons: [
      'A live app with 2,000+ weekly users, and a write-up of the week it nearly fell over.',
      'Admin panel in TypeScript; moving the rest of the app over now.',
      'Pacific time. Public post-mortems since 2025.',
    ],
    ask: 'what would they change about the cache if traffic doubled?',
  },
  {
    id: 'c',
    no: '09A',
    alias: 'amber-finch',
    ctx: 'Data science · Senior',
    line: 'Moved a lab’s data pipeline from cron jobs to a queue.',
    m: ['y', 'n', 'y', 'y', 'y'],
    interest: 'new this week',
    avail: 'May 2027',
    reasons: [
      'The pipeline feeds a dashboard 40 researchers use.',
      'Python services; no TypeScript yet.',
      'Writes a runbook for every job she ships.',
    ],
    ask: 'how fast would they pick up TypeScript?',
  },
  {
    id: 'd',
    no: '10A',
    alias: 'slate-wren',
    ctx: 'CS · Senior',
    line: 'Two internships writing Go services at campus startups.',
    m: ['h', 'y', 'n', 'y', 'h'],
    interest: 'replied to a post',
    avail: 'Dec 2026',
    reasons: [
      'Two internships, both with code review; the tools were internal.',
      'TypeScript on both teams’ dashboards.',
      'Graduates in December and wants a full-time role, not a summer.',
    ],
    ask: 'would a summer internship still interest them?',
  },
  {
    id: 'e',
    no: '11A',
    alias: 'moss-lark',
    ctx: 'CS · Junior',
    line: 'Rewrote the dorm-laundry API that 900 students check daily.',
    m: ['y', 'y', 'y', 'y', 'h'],
    interest: 'follows Northwind',
    avail: 'Jun 2027',
    reasons: [
      '900 daily users, with a public status page.',
      'TypeScript web client over a Go API.',
      'Status updates are short and clear; no longer write-ups yet.',
    ],
    ask: 'how do they handle being on call for a campus app?',
  },
  {
    id: 'f',
    no: '12A',
    alias: 'tidal-fox',
    ctx: 'Math + CS · Junior',
    line: 'Contributes to an open-source Postgres extension.',
    m: ['n', 'h', 'y', 'y', 'y'],
    interest: 'open to chats',
    avail: 'Jun 2027',
    reasons: [
      'Four merged patches to a Postgres extension, but no product with users yet.',
      'C and Rust; TypeScript only in coursework.',
      'Patch descriptions read like good design docs.',
    ],
    ask: 'would they enjoy product work, not just internals?',
  },
  {
    id: 'g',
    no: '13A',
    alias: 'cinder-owl',
    ctx: 'EE · Senior',
    line: 'Ran the infrastructure for a 400-person hackathon.',
    m: ['y', 'h', 'y', 'y', 'y'],
    interest: 'went to your AMA',
    avail: 'Jun 2027',
    reasons: [
      'The judging app served 400 people with zero downtime over 36 hours.',
      'Some TypeScript; mostly Python and Terraform.',
      'Wrote up what broke at 3 a.m. and what they did.',
    ],
    ask: 'what broke at 3 a.m., and what did they do?',
  },
  {
    id: 'h',
    no: '14A',
    alias: 'field-vole',
    ctx: 'CS · Junior',
    line: 'Built the mobile app and API for a student bank club.',
    m: ['y', 'y', 'y', 'h', 'h'],
    interest: 'new this week',
    avail: 'Jun 2027',
    reasons: [
      '300 members track club budgets with it.',
      'React Native app and a TypeScript API.',
      'Has a class 11–1 Pacific on Tuesdays and Thursdays.',
    ],
    ask: 'how would they handle the pairing days they miss?',
  },
];

/** Sections of a candidate page that a match note can light up. */
export type EvidenceSection = 'work' | 'look' | 'write';

export type MatchNote = { k: MustKey; t: string; sub: string; mark: Mark; section?: EvidenceSection };

export type CandidateVersion = {
  name: string;
  ctxLine: string;
  nowLine: string;
  headline: string;
  proj: string;
  projDesc: string;
  projLink: string;
  tz: string;
  note: string;
};

/** Frame 08A as a startup sees it: anonymous now, named once quiet-otter accepts (V2-S07). */
export const quietOtter: {
  no: string;
  alias: string;
  versions: { anon: CandidateVersion; revealed: CandidateVersion };
  notes: MatchNote[];
} = {
  no: '08A',
  alias: 'quiet-otter',
  versions: {
    anon: {
      name: 'quiet-otter',
      ctxLine: 'Anonymous · CS junior · Southern California',
      nowLine: 'Now · moving a campus app to TypeScript',
      headline: 'Kept a 2,000-student app up through move-in week.',
      proj: 'A campus marketplace app',
      projDesc: 'Second-hand trading for students at one university, run with one friend. About 2,000 weekly users.',
      projLink: 'Links hidden until they accept',
      tz: 'Pacific time.',
      note: 'Anonymous version: written separately from the public page. School and project names are generalized, numbers rounded, links and contact hidden. The name appears only if quiet-otter accepts.',
    },
    revealed: {
      name: 'Lin Zhou',
      ctxLine: 'CS · junior · UC San Diego',
      nowLine: 'Now · moving Campus Marketplace to TypeScript',
      headline: 'Kept Campus Marketplace up for 2,000 UCSD students through move-in week.',
      proj: 'Campus Marketplace',
      projDesc:
        'Second-hand trading for UCSD students, run with one friend since fall 2025. About 2,000 weekly users.',
      projLink: 'github.com/[handle]/campus-marketplace',
      tz: 'Pacific time · San Diego, Bay Area or remote.',
      note: 'Shown because quiet-otter accepted on Oct 21. Photo and voice stay off in startup views unless Lin turns them on.',
    },
  },
  notes: [
    { k: 'M1', t: 'Shipped something people use', sub: '2,000+ weekly users · shown', mark: 'y', section: 'work' },
    { k: 'M2', t: 'Comfortable in TypeScript', sub: 'admin panel · repo', mark: 'y', section: 'work' },
    { k: 'M3', t: 'Free June–August 2027', sub: 'from Looking for', mark: 'y', section: 'look' },
    { k: 'M4', t: 'Overlaps 10–3 Pacific', sub: 'Pacific time', mark: 'y', section: 'look' },
    { k: 'M5', t: 'Writes clearly', sub: 'public post-mortem · shown', mark: 'y', section: 'write' },
  ],
};

/** Frame 07A, night-heron, as drawn with the agent panel open (V2-S01b) and out of requests (V2-S13b). */
export const nightHeron: {
  no: string;
  alias: string;
  nowLine: string;
  ctxLine: string;
  headline: string;
  notes: MatchNote[];
} = {
  no: '07A',
  alias: 'night-heron',
  nowLine: 'Now · shipping v2 of an accessible form library',
  ctxLine: 'Anonymous · career switcher · self-taught frontend',
  headline: 'Left a biology lab to build the tools it never had.',
  notes: [
    { k: 'M1', t: 'Shipped something people use', sub: 'form library · three nonprofits use it', mark: 'y' },
    { k: 'M2', t: 'Comfortable in TypeScript', sub: 'every repo since 2024', mark: 'y' },
    { k: 'M3', t: 'Free June–August 2027', sub: 'from Looking for', mark: 'y' },
    { k: 'M4', t: 'Overlaps 10 a.m.–3 p.m. Pacific', sub: 'New York · overlaps 10–2 only', mark: 'h' },
    { k: 'M5', t: 'Writes clearly', sub: 'post-mortems after every release', mark: 'y' },
  ],
};

/** URL segment of a frame: "08A" → "08a". */
export const frameSlug = (no: string) => no.toLowerCase();

export function frameBySlug(slug: string): SheetFrame | undefined {
  return sheetFrames.find((f) => frameSlug(f.no) === slug.toLowerCase());
}

/**
 * Must-haves met, counted the way the sheet writes them: a "partly" is half,
 * so y y y h y → "4½" and h y n y h → "3".
 */
export function scoreOf(m: Mark[]): string {
  const n = m.reduce((a, x) => a + (x === 'y' ? 1 : x === 'h' ? 0.5 : 0), 0);
  const whole = Math.floor(n);
  return n % 1 ? (whole ? `${whole}½` : '½') : String(whole);
}

/** "Shipped to users: yes, TypeScript: yes, …" for the must boxes. */
export function mustAria(m: Mark[]): string {
  return m.map((x, i) => `${mustHaves[i]!.short}: ${MARK_LABEL[x]}`).join(', ');
}
