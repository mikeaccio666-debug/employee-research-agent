// Fixture data for the growth screens, copied from the canvas boards:
// S17 growth plan (Lin), S19 referral subscription and S19b referral packet (Alex).
import type { Basis, MustMark } from '@portrait/ui';

/* ── S17 · growth plan ─────────────────────────────────────────────── */

/** How many backend-intern postings the plan was compared against (last 90 days). */
export const GROW_COMPANIES = 37;

export type GrowNeed = {
  t: string;
  /** asked for by n of 37 */
  n: number;
  src: string;
  mark: MustMark;
  status: string;
};

/** "Where you stand". The "Tests and CI" row changes once plan item 1 is done. */
export function growNeeds(testsDone: boolean): GrowNeed[] {
  return [
    { t: 'Shipped to real users', n: 31, src: 'Campus Marketplace · shown', mark: 'y', status: 'Met' },
    { t: 'SQL under load', n: 19, src: 'Move-in week fix · shown', mark: 'y', status: 'Met' },
    {
      t: 'Tests and CI',
      n: 26,
      src: testsDone ? 'CI run 412 · shown · just now' : 'You said you write tests; nothing on the page shows it',
      mark: testsDone ? 'y' : 'h',
      status: testsDone ? 'Met' : 'Needs proof',
    },
    { t: 'Code review on a team', n: 22, src: 'Solo project so far', mark: 'n', status: 'Needs practice' },
    { t: 'System design basics', n: 14, src: 'Said in chat · turn 11', mark: 'y', status: 'Met' },
  ];
}

/** Index of the need that plan item 1 closes. */
export const TESTS_NEED = 2;

export type PlanState = 0 | 1 | 2;
export const PLAN_STATE_LABEL: Record<PlanState, string> = { 0: 'Not started', 1: 'In progress', 2: 'Done' };

export type PlanItem = { n: number; t: string; kind: string; done: string; why: string };

export const planItems: PlanItem[] = [
  {
    n: 1,
    t: 'Add tests and CI to Campus Marketplace',
    kind: 'Project · about 6 hours',
    done: 'a green CI run, and a short note on what’s covered.',
    why: 'Closes “Tests and CI”, asked for by 26 of 37.',
  },
  {
    n: 2,
    t: 'Get one pull request merged in an open-source project',
    kind: 'Practice · two weekends',
    done: 'merged, with review comments you answered.',
    why: 'Closes “Code review on a team”, asked for by 22 of 37.',
  },
  {
    n: 3,
    t: 'Write “How I’d scale the marketplace 10×”',
    kind: 'Writing · about 3 hours',
    done: 'a one-page design doc linked from Campus Marketplace.',
    why: 'Strengthens “System design basics”.',
  },
  {
    n: 4,
    t: 'Practice a system design chat',
    kind: 'Practice · 45 minutes',
    done: 'notes saved. Done Oct 12.',
    why: 'You can do another with an insider.',
  },
];

export const initialPlanState: Record<number, PlanState> = { 1: 1, 2: 0, 3: 0, 4: 2 };

/* ── S19 · referral subscription ───────────────────────────────────── */

export type VerifyState = 'ok' | 'rev' | 'asked' | 'need' | 'todo';
export type LabProof = 'need' | 'rev';
export type Reference = 'todo' | 'asked';

export const VERIFY_LABEL: Record<VerifyState, string> = {
  ok: 'Verified',
  rev: 'In review',
  need: 'Needs a document',
  asked: 'Asked',
  todo: 'Not started',
};

export type VerifyStep = { key: string; t: string; d: string; st: VerifyState };

/** The six checks behind Alex's packet; `lab` and `ref` move when Alex uploads or asks. */
export function verifySteps(lab: LabProof, ref: Reference): VerifyStep[] {
  return [
    { key: 'identity', t: 'Identity', d: 'Email and phone', st: 'ok' },
    { key: 'github', t: 'GitHub account is yours', d: 'Signed in with GitHub · 3 repos linked', st: 'ok' },
    { key: 'formkit', t: 'form-kit is your work', d: 'Commits, releases and the demo checked', st: 'ok' },
    {
      key: 'lab',
      t: 'Two years as a lab technician',
      d:
        lab === 'need'
          ? 'An offer letter, or a pay stub with the amounts covered, is enough.'
          : 'Uploaded just now · a person is checking it · about 2 days',
      st: lab === 'need' ? 'need' : 'rev',
    },
    {
      key: 'bootcamp',
      t: 'Bootcamp certificate',
      d: 'Uploaded Oct 18 · a person is checking it · about 2 days',
      st: 'rev',
    },
    {
      key: 'reference',
      t: 'A reference · optional',
      d:
        ref === 'todo'
          ? 'Someone who saw your work — a former supervisor or a user of your project.'
          : 'Asked Dr. Hale · Oct 19',
      st: ref === 'todo' ? 'todo' : 'asked',
    },
  ];
}

/* ── S19b · referral packet ────────────────────────────────────────── */

export type PacketLine = { id: string; t: string; fn: string };

/** The note, drafted from Alex's portrait. Footnotes point at the Sources panel. */
export const packetNote: PacketLine[] = [
  {
    id: 'n1',
    t: 'I left a biology lab to build the tools it never had, and I’ve shipped three projects people still use.',
    fn: '1',
  },
  {
    id: 'n2',
    t: 'Fernway’s checkout forms are where accessibility and money meet; my form library is built for exactly that.',
    fn: '2',
  },
  { id: 'n3', t: 'I work best on a small team where I can talk to the people using what I build.', fn: '3' },
];

export type PacketEvidence = { id: string; k: string; t: string; d: string; basis: Basis; src: string };

export const packetEvidence: PacketEvidence[] = [
  {
    id: 'e1',
    k: 'i.',
    t: 'form-kit · accessible React forms',
    d: 'Used by three nonprofits; screen-reader tested',
    basis: 'ver',
    src: 'Verified · GitHub',
  },
  {
    id: 'e2',
    k: 'ii.',
    t: 'Sample-tracking board for a 12-person lab',
    d: 'Replaced a shared spreadsheet; still in daily use',
    basis: 'shown',
    src: 'Shown · lab letter in review',
  },
  {
    id: 'e3',
    k: 'iii.',
    t: 'Case study: rebuilding a plant-care app’s onboarding',
    d: 'Written up on the portrait; numbers not sourced yet',
    basis: 'said',
    src: 'Said · portrait',
  },
];

/** Lines Alex has already confirmed when the packet opens. */
export const packetConfirmed: Record<string, boolean> = { n1: true, n2: true, e1: true, e2: true };

export const packetSources =
  '1 Chat, turn 3 · 2 github.com/[handle]/form-kit · 3 Chat, turn 7 · 4 GitHub, verified · 5 Lab letter, in review · 6 Portrait, Work';
