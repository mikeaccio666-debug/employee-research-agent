// Fixture data for the connection screens, taken from the boards' DCLogic:
// S08 inbox, S08b coffee chat, S20 two-way review, S20b scores and disputes, S11 company page.
// Everyone and everything here is fictional (see cast.ts).

/* ---------- S08 · Lin's inbox ---------- */

export type ThreadId = 'n' | 'j' | 'l';

export type InboxThread = {
  id: ThreadId;
  name: string;
  /** "2d" — how long ago it arrived */
  when: string;
  preview: string;
  /** Drawn with the unread dot */
  unread: boolean;
  /** Expired threads are drawn in ink-3 */
  old?: boolean;
  /** What the agent is looking at while this thread is open */
  context: string;
};

export const inboxThreads: InboxThread[] = [
  {
    id: 'n',
    name: 'Northwind',
    when: '2d',
    preview: 'Coffee chat · SWE Intern · “Your move-in week write-up is…”',
    unread: true,
    context: 'Inbox › Northwind',
  },
  {
    id: 'j',
    name: 'Jordan Lee · insider',
    when: '1d',
    preview: 'Coffee chat offer · “Happy to swap notes for 20 minutes.”',
    unread: true,
    context: 'Inbox › Jordan Lee',
  },
  {
    id: 'l',
    name: 'Lumen Labs',
    when: '5d',
    preview: 'Chat · expired after 14 days',
    unread: false,
    old: true,
    context: 'Inbox › Lumen Labs',
  },
];

/** The nav badge: two unread requests until Lin answers Northwind's. */
export function inboxUnread(answeredNorthwind: boolean): number {
  return answeredNorthwind ? 1 : 2;
}

export const northwindRequest = {
  expires: 'Nov 2',
  daysLeft: '12 days left',
  answeredOn: 'Oct 21',
};

export const northwindTagline = 'Every neighborhood restaurant should know what’s in its kitchen.';

/** "About Northwind" in the inbox rail. */
export const northwindInboxFacts: [string, string][] = [
  ['Stage', 'Seed'],
  ['People', '6'],
  ['Where', 'San Francisco · hybrid'],
  ['Stack', 'TypeScript · Go · Postgres'],
];

/* ---------- S08b · coffee chat with Northwind (Dana) ---------- */

export const CHAT_DAYS = ['Mon 26', 'Tue 27', 'Wed 28', 'Thu 29', 'Fri 30'] as const;
export const CHAT_DAYS_LONG = ['Mon Oct 26', 'Tue Oct 27', 'Wed Oct 28', 'Thu Oct 29', 'Fri Oct 30'] as const;
/** Half-hour rows: 0 = 9:00 PT … 15 = 4:30 PT. */
export const CHAT_ROWS = 16;
/** Dana is in Toronto, 3 hours ahead. */
export const ET_OFFSET = 3;

/** Dana's shared free times, by day → rows. */
const DANA_FREE: Record<number, number[]> = { 0: [0, 1, 2], 1: [2, 3, 4], 2: [8, 9, 10], 3: [0, 1, 10, 11], 4: [2, 3, 4, 5] };
/** Busy on Lin's calendar, by day → rows. */
const LIN_BUSY: Record<number, number[]> = { 1: [4, 5, 6], 3: [4, 5, 6, 12, 13, 14] };

export const cellKey = (day: number, row: number) => `${day}-${row}`;

export function parseCellKey(key: string): [number, number] {
  const [d, r] = key.split('-').map(Number);
  return [d ?? 0, r ?? 0];
}

export const isDanaFree = (day: number, row: number) => (DANA_FREE[day] ?? []).includes(row);
export const isLinBusy = (day: number, row: number) => (LIN_BUSY[day] ?? []).includes(row);

/** What Lin has already marked free when the board opens. */
export function initialFreeTimes(): Record<string, true> {
  const sel: Record<string, true> = {};
  const marked: [number, number[]][] = [
    [0, [0, 1]],
    [2, [9, 10, 11]],
    [4, [1, 2, 3]],
  ];
  for (const [d, rows] of marked) for (const r of rows) sel[cellKey(d, r)] = true;
  return sel;
}

function clock(minutes: number, padMinutes: boolean): string {
  const h = Math.floor(minutes / 60);
  const mm = minutes % 60;
  const h12 = ((h + 11) % 12) + 1;
  const m = padMinutes ? String(mm).padStart(2, '0') : mm ? '30' : '00';
  return `${h12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** Start of a half-hour row, shifted by `offsetHours` (0 = PT, 3 = ET): "9:00 AM". */
export function slotTime(row: number, offsetHours = 0): string {
  return clock(9 * 60 + row * 30 + offsetHours * 60, false);
}

/** End of a 20-minute chat that starts on `row`, in PT: "9:20 AM". */
export function slotEnd(row: number): string {
  return clock(9 * 60 + row * 30 + 20, true);
}

/* ---------- S20 · two-way review after a coffee chat ---------- */

export type MatchAnswer = 'yes' | 'mostly' | 'no';
export type FlagId = 'f1' | 'f2' | 'f3';

/** Portrait lines Jordan can flag when Alex's portrait didn't quite match. */
export const reviewFlagLines: { id: FlagId; text: string }[] = [
  { id: 'f1', text: '“Shipped three projects people use”' },
  { id: 'f2', text: '“Led a team of 5 at the lab”' },
  { id: 'f3', text: '“Accessibility-first form library”' },
];

export const reviewInitial = {
  /** Jordan's overall score for Alex */
  a: 4,
  /** Alex's overall score for Jordan */
  b: 5,
  match: 'mostly' as MatchAnswer,
  flags: { f2: true } as Partial<Record<FlagId, boolean>>,
  money: 'no' as 'no' | 'yes',
};

/* ---------- S20b · scores and disputes ---------- */

export const jordanScore = {
  score: '4.9',
  summary: '11 reviews · coffee chats',
  /** marks → share of reviews (bar width) and count */
  distribution: [
    { marks: 5, pct: 91, count: 10 },
    { marks: 4, pct: 9, count: 1 },
    { marks: 3, pct: 0, count: 0 },
    { marks: 2, pct: 0, count: 0 },
    { marks: 1, pct: 0, count: 0 },
  ],
  facts: [
    ['On time', '11 of 11'],
    ['Respectful', '5.0'],
    ['Kept promises', '7 of 7 due'],
  ] as [string, string][],
  quotes: [
    {
      text: '“Read my portrait before we talked and asked about the exact project I was stuck on.”',
      meta: '5 · a job seeker · Oct 2026',
    },
    {
      text: '“Helpful, a bit rushed at the end. Sent the intro he promised the next day.”',
      meta: '4 · a job seeker · Sep 2026',
    },
  ],
};

/* ---------- S11 · Northwind's public company page ---------- */

export const northwindFacts: [string, string][] = [
  ['Stage', 'Seed'],
  ['People', '6'],
  ['Founded', '2025'],
  ['Stack', 'TypeScript, Go, Postgres'],
  ['Work', 'SF two days a week, or remote'],
];

/** The company's height line: restaurants using it every morning. x/y are in the 600 × 200 chart box. */
export const northwindGrowth = [
  { value: '3', month: 'Jan 2026', x: 60, top: 166, labelLeft: '10%', labelTop: 120 },
  { value: '11', month: 'Apr', x: 220, top: 132, labelLeft: '36.7%', labelTop: 88 },
  { value: '24', month: 'Jul', x: 380, top: 84, labelLeft: '63.3%', labelTop: 40 },
  { value: '40 · now', month: 'Oct', x: 540, top: 22, labelLeft: '90%', labelTop: -4, now: true },
];
export const northwindGrowthLabel = '3 restaurants in January 2026, 11 in April, 24 in July, 40 in October';

export type OfficeHourSlot = { time: string; taken?: boolean };
/** Wed Oct 28, Lin's time (PT). 4:15 is taken. */
export const officeHourSlots: OfficeHourSlot[] = [{ time: '4:00' }, { time: '4:15', taken: true }, { time: '4:30' }, { time: '4:45' }];
export const officeHourDefault = '4:30';

export const northwindPeople = [
  { initials: 'SO', name: 'Sam Okafor', about: 'CEO · six years running ordering for a restaurant group' },
  { initials: 'DW', name: 'Dana Wu', about: 'CTO · Toronto · inventory systems for grocery chains' },
];

export const northwindEvents = [
  { day: '29', title: 'What does an intern actually do at a six-person startup?', meta: 'Oct · AMA' },
  { day: '12', title: 'Founding engineer at Northwind: ask us anything.', meta: 'Nov · AMA' },
];
