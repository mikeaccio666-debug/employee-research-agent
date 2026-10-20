// Fixture data for the event screens (S01b-Event, S10 program, S10b event page, S10c create),
// copied from the canvas boards' DCLogic. Everyone and every company here is fictional.

/** The one event with its own page: Northwind's intern AMA. */
export const AMA_SLUG = 'northwind-ama';

/** An event on the program (S10). */
export type ProgramEvent = {
  id: string;
  /** Day of the month, or the weekday for a weekly event. */
  d: string;
  /** Weekday under the date, or "weekly". */
  w: string;
  title: string;
  kind: string;
  time: string;
  len: string;
  about: string;
  /** Handwritten "For you because …" line. */
  why?: string;
  /** Has its own event page. */
  page?: boolean;
  /** Full: the button offers the waitlist. */
  full?: boolean;
  /** Office hours: the button books a slot. */
  slot?: boolean;
  forYou: boolean;
};

export type ProgramWeek = { id: string; label: string; range: string; events: ProgramEvent[] };

export const programWeeks: ProgramWeek[] = [
  {
    id: 'this',
    label: 'This week',
    range: 'Oct 26 – Nov 1',
    events: [
      {
        id: 'a',
        d: '27',
        w: 'Tue',
        title: 'How we test payments without a staging bank',
        kind: 'Tech talk · Fernway · Series B',
        time: '5:00 PM',
        len: '45 min',
        about: 'Two engineers on the fakes, contract tests and the one bug that still got through.',
        forYou: true,
      },
      {
        id: 'b',
        d: '29',
        w: 'Thu',
        title: 'What does an intern actually do at a six-person startup?',
        kind: 'AMA · Northwind · seed',
        time: '6:00 PM',
        len: '45 min · 64 going',
        about:
          'Sam and Dana answer questions about the summer internship: what you’d ship in twelve weeks and how six people decide.',
        why: 'For you because you’re looking at early-stage backend roles.',
        page: true,
        forYou: true,
      },
      {
        id: 'c',
        d: '29',
        w: 'Thu',
        title: 'CPT, OPT and your first startup job',
        kind: 'Roundtable · Portrait with three startups',
        time: '7:30 PM',
        len: '60 min',
        about: 'Founders and students compare notes on timing, paperwork and what a small team can sponsor.',
        forYou: true,
      },
      {
        id: 'd',
        d: '30',
        w: 'Fri',
        title: 'Founding designer: what the role really is',
        kind: 'Info session · Lumen Labs · seed',
        time: '12:00 PM',
        len: '30 min · full',
        about: 'For designers. A waitlist opens if someone cancels.',
        full: true,
        forYou: false,
      },
      {
        id: 'e',
        d: 'Wed',
        w: 'weekly',
        title: 'Northwind office hours',
        kind: 'Office hours · 15-minute slots · two a week per person',
        time: '4:00 PM',
        len: 'every Wednesday',
        about: 'Bring a question about the role, the stack or the restaurants. Dana or Sam, alternating.',
        slot: true,
        forYou: true,
      },
    ],
  },
  {
    id: 'next',
    label: 'Next week',
    range: 'Nov 2 – Nov 8',
    events: [
      {
        id: 'f',
        d: '05',
        w: 'Thu',
        title: 'Showcase night: five startups, five minutes each',
        kind: 'Showcase · Portrait · every two weeks',
        time: '5:30 PM',
        len: '90 min · 210 going',
        about: 'Five founders, five minutes each, then open rooms. Come as yourself or as your alias.',
        forYou: true,
      },
    ],
  },
];

/** Lin is already registered for the AMA when the program opens. */
export const initialRegistrations: Record<string, boolean> = { b: true };

/** A question on the AMA, with its votes before Lin's. */
export type AmaQuestion = { id: string; text: string; by: string; n: number; yours?: boolean };

/** The question the agent drafts from Lin's move-in week story (S01b), already posted on S10b. */
export const DRAFTED_QUESTION = 'When a query gets slow under load, do you reach for caching or the schema first?';

export const amaQuestions: AmaQuestion[] = [
  { id: 'h', text: 'How do you decide what not to build with only six people?', by: 'night-heron · Oct 15', n: 14 },
  { id: 'k', text: 'Do you work with a designer, or does engineering own the screens?', by: 'paper-kite · Oct 16', n: 9 },
  { id: 'v', text: 'Why restaurants, and not grocery?', by: 'field-vole · Oct 17', n: 5 },
];

/** S10b: Lin's own question, posted Oct 19 under the alias. */
export const linQuestion: AmaQuestion = { id: 'mine', text: DRAFTED_QUESTION, by: 'quiet-otter · Oct 19', n: 0, yours: true };

/** S10b: what the question box holds when the page opens. */
export const AMA_DRAFT = 'Would an intern ship to real restaurants in the first month, or work on internal tools first?';

export const amaHosts = [
  { initials: 'SO', name: 'Sam Okafor', about: 'CEO · ran a restaurant group’s ordering for six years' },
  { initials: 'DW', name: 'Dana Wu', about: 'CTO · Toronto · built inventory systems for grocery chains' },
];
