// Fixture data for the entry, settings, pricing and publish screens (S03, S12, S13, S15),
// copied from each board's DCLogic. The cast is fictional.
import type { Basis } from '@portrait/ui';

/* ── S03 · landing ─────────────────────────────────────────────────────── */

/** The landing page's one switch: "I’m looking for work" ↔ "people". */
export type Who = 'work' | 'people';

export type Shot = {
  id: string;
  /** frame number, e.g. "01A" */
  no: string;
  name: string;
  ctx: string;
  line: string;
  /** the proof behind the line: basis + text */
  rows: [Basis, string][];
};

export const landingShots: Record<Who, Shot[]> = {
  work: [
    {
      id: 'a',
      no: '01A',
      name: 'quiet-otter',
      ctx: 'CS · junior',
      line: 'Builds the thing first, then finds out who needed it.',
      rows: [
        ['shown', 'Move-in week write-up, with p95 before and after'],
        ['ver', '214 commits · verified on GitHub'],
        ['said', '“I read the slow-query log before I guess.”'],
      ],
    },
    {
      id: 'b',
      no: '02A',
      name: 'paper-kite',
      ctx: 'Interaction design · new grad',
      line: 'Designs with the people at the counter, not just for them.',
      rows: [
        ['shown', 'Six rounds of testing at a clinic desk'],
        ['ver', 'Clinic manager vouched'],
        ['said', '“I have more work than words.”'],
      ],
    },
    {
      id: 'c',
      no: '03A',
      name: 'night-heron',
      ctx: 'Self-taught · frontend',
      line: 'Left a biology lab to build the tools it never had.',
      rows: [
        ['shown', 'Form library three nonprofits use'],
        ['ver', 'Lab manager vouched'],
        ['said', '“I write the post-mortem even when nothing broke.”'],
      ],
    },
    {
      id: 'd',
      no: '04A',
      name: 'slow-comet',
      ctx: 'Stats · senior',
      line: 'Turns messy lab data into charts people trust.',
      rows: [
        ['shown', 'Dashboard 40 researchers open weekly'],
        ['said', 'Résumé · R and Python'],
        ['inf', 'Inferred: comfortable presenting'],
      ],
    },
  ],
  people: [
    {
      id: 'a',
      no: '07A',
      name: 'night-heron',
      ctx: 'Career switcher · self-taught',
      line: 'Built an accessible form library three nonprofits use.',
      rows: [
        ['shown', 'M1 · shipped to real users'],
        ['ver', 'M2 · TypeScript in every repo since 2024'],
        ['said', 'M4 · overlaps 10–2 PT only'],
      ],
    },
    {
      id: 'b',
      no: '08A',
      name: 'quiet-otter',
      ctx: 'CS · junior',
      line: 'Kept a 2,000-student app up through move-in week.',
      rows: [
        ['ver', 'M1 · 2,000+ weekly users'],
        ['shown', 'M2 · migrating the app to TypeScript now'],
        ['said', 'M4 · Pacific time, fully overlaps'],
      ],
    },
    {
      id: 'c',
      no: '11A',
      name: 'moss-lark',
      ctx: 'CS · junior',
      line: 'Rewrote the dorm-laundry API that 900 students check daily.',
      rows: [
        ['shown', 'M1 · public status page'],
        ['said', 'M2 · TypeScript in the web client'],
        ['said', 'M3 · free June–August 2027'],
      ],
    },
    {
      id: 'd',
      no: '13A',
      name: 'cinder-owl',
      ctx: 'EE · senior',
      line: 'Ran the infrastructure for a 400-person hackathon.',
      rows: [
        ['shown', 'Zero downtime over 36 hours, with a write-up'],
        ['said', 'M2 · some TypeScript, mostly Python'],
        ['said', 'Went to your AMA'],
      ],
    },
  ],
};

export type LandingCopy = {
  word: string;
  wordAria: string;
  flipHint: string;
  askLabel: string;
  askPh: string;
  askBtn: string;
  chip: string;
  askHelp: string;
  howLab: string;
  steps: { h: string; d: string }[];
  shotsLab: string;
  shotsHelp: string;
  /** the fairness note at the bottom: bold lead + the rest */
  fair: { lead: string; rest: string };
};

export const landingCopy: Record<Who, LandingCopy> = {
  work: {
    word: 'work',
    wordAria: 'work. Switch to people',
    flipHint: 'Hiring? Tap “work” to switch to people.',
    askLabel: 'Tell us one thing you made',
    askPh: 'Tell me one thing you made. Any language.',
    askBtn: 'Start talking',
    chip: 'Drop a résumé instead',
    askHelp: 'No account until you want to keep your page.',
    howLab: 'Three steps · no résumé required',
    steps: [
      { h: 'Talk', d: 'One question at a time, in any language.' },
      { h: 'See your portrait', d: 'A page that is only yours. Every line links to where it came from.' },
      { h: 'Get found', d: 'Startups find you by what you’ve done, not where you studied.' },
    ],
    shotsLab: 'Portraits drawn this week · names or aliases, as each person chose',
    shotsHelp: 'Tap one to see the proof behind its line',
    fair: {
      lead: 'You stay anonymous until you say yes.',
      rest: 'Startups see what you’ve done, never your name, photo or school, until you accept a chat.',
    },
  },
  people: {
    word: 'people',
    wordAria: 'people. Switch to work',
    flipHint: 'Looking for a job? Tap “people” to switch back to work.',
    askLabel: 'Who do you need?',
    askPh: 'Who do you need? Say it like you would to a friend.',
    askBtn: 'Describe them',
    chip: 'Paste a job post instead',
    askHelp: 'We’ll ask what “strong” means to you.',
    howLab: 'From a job post to a coffee chat',
    steps: [
      { h: 'Describe', d: 'Say who you need, or paste the post.' },
      { h: 'Read reasons', d: 'Every match comes with three reasons, each linked to evidence.' },
      { h: 'Talk', d: 'Send a note. Names appear only when the person says yes.' },
    ],
    shotsLab: 'What a shortlist looks like · SWE Intern, Summer 2027',
    shotsHelp: 'Tap one to see its reasons',
    fair: {
      lead: 'We never filter by age, gender, ethnicity, religion, family status or disability.',
      rest: 'Early-stage startups only, each one checked by a person before it can search.',
    },
  },
};

export const landingEvents = [
  {
    day: '29',
    title: 'What does an intern actually do at a six-person startup?',
    meta: 'AMA · Northwind · Thu Oct 29 · 6 PM PT',
    going: '64 going',
  },
  {
    day: '05',
    title: 'Showcase night: five startups, five minutes each',
    meta: 'Showcase · Thu Nov 5 · 5:30 PM PT',
    going: '210 going',
  },
];

/* ── S12 · privacy and S15 · first publish ─────────────────────────────── */

export type Visibility = 'public' | 'anon' | 'link' | 'hidden';

export type VisibilityChoice = {
  value: Visibility;
  title: string;
  description: string;
  recommended?: boolean;
};

/** S12: the settings version of the four choices. */
export const privacyVisibility: VisibilityChoice[] = [
  { value: 'public', title: 'Public', description: 'Anyone with the link, and search engines. Startups see your name.' },
  {
    value: 'anon',
    title: 'Anonymous · discoverable',
    description: 'Startups find you as quiet-otter. Name, photo and school stay hidden until you accept.',
    recommended: true,
  },
  { value: 'link', title: 'Link only', description: 'Only people you give the link to. Not in search or matches.' },
  { value: 'hidden', title: 'Hidden', description: 'Only you. Good for drafting.' },
];

/** Who sees a sensitive field: 0 matching only · 1 after connecting · 2 public. */
export type FieldLevel = 0 | 1 | 2;
export type SensitiveField = { id: 'wa' | 'pay' | 'ct'; name: string; value: string };

export const sensitiveFields: SensitiveField[] = [
  { id: 'wa', name: 'Work authorization', value: 'CPT for summer 2027' },
  { id: 'pay', name: 'Pay expectations', value: 'Not set' },
  { id: 'ct', name: 'Contact details', value: 'Email, phone' },
];

export const fieldLevelLabels: Record<FieldLevel, string> = {
  0: 'Matching only',
  1: 'After connecting',
  2: 'Public',
};

export const initialFieldLevels: Record<SensitiveField['id'], FieldLevel> = { wa: 0, pay: 0, ct: 1 };

/** S12's preview card: what a startup sees for each visibility. */
export const privacyPreview = {
  named: {
    name: 'Lin Zhou',
    ctx: 'CS · junior · UC San Diego',
    line: 'Kept Campus Marketplace up for 2,000 UCSD students through move-in week.',
    links: 'Links: github.com/[handle] · campus-marketplace.app',
  },
  anon: {
    name: 'quiet-otter',
    ctx: 'CS · junior · Southern California',
    line: 'Kept a 2,000-student app up through move-in week.',
    links: 'Links hidden until you accept',
  },
  hidden: {
    link: 'Startups don’t see you in search or matches. People with your link see your full page.',
    hidden: 'Nobody but you can see this page.',
  },
  note: {
    anon: 'Anonymity is our best effort. If you also share your named link widely, people may connect the two.',
    public: 'Your photo and voice still stay off in startup lists.',
    other: 'Requests already sent to you stay in your inbox.',
  },
};

/** S15: the first-publish version, each with its button label. */
export const publishVisibility: (VisibilityChoice & { cta: string })[] = [
  { value: 'public', title: 'Public', description: 'Anyone with the link, and search engines.', cta: 'Publish as Lin Zhou' },
  {
    value: 'anon',
    title: 'Anonymous · discoverable',
    description: 'Startups find you as quiet-otter. Your name appears only when you accept.',
    cta: 'Publish as quiet-otter',
    recommended: true,
  },
  { value: 'link', title: 'Link only', description: 'Only people you send the link to.', cta: 'Publish, link only' },
  { value: 'hidden', title: 'Hidden', description: 'Only you, while you keep drafting.', cta: 'Save, keep hidden' },
];

export type PublishCheck = { id: 'a' | 'b' | 'c' | 'd'; title: string; detail: string };

export const publishChecks: PublishCheck[] = [
  {
    id: 'a',
    title: 'Name, school and links are hidden in the anonymous version',
    detail: 'Startups see “CS junior, Southern California”. Numbers are rounded and project names generalized.',
  },
  {
    id: 'b',
    title: 'Photo and voice stay off for anonymous viewers',
    detail: 'They never show in startup lists. You can turn them on for your public link later.',
  },
  {
    id: 'c',
    title: 'Three lines quote you directly',
    detail: 'From chat turns 3, 6 and 9. Each one links back to what you said. Remove any you don’t want shown.',
  },
  {
    id: 'd',
    title: 'Work authorization is “matching only”',
    detail: 'We use it to find fits and never show it. Change it any time under Sensitive fields.',
  },
];

/* ── S13 · pricing ─────────────────────────────────────────────────────── */

/** A table cell: text, a tick (included) or a dash (not included). */
export type PlanCell = string | { yes: true } | { no: true };
export const YES = { yes: true } as const;
export const NO = { no: true } as const;

export type PlanRow = { label: string; note?: string; cells: PlanCell[] };

export const startupRows: PlanRow[] = [
  { label: 'Company page and events', cells: ['1 event a month', 'Unlimited', 'Unlimited · featured slot'] },
  { label: 'Briefs', cells: ['1', '3', '10'] },
  { label: 'Matches you can see', cells: ['Top 10, anonymous', 'Full list', 'Full list'] },
  {
    label: 'Connection requests a month',
    note: 'Unanswered after 14 days? It comes back.',
    cells: ['3', '40', '150'],
  },
  { label: 'Seats', cells: ['1', '3', '10'] },
  { label: 'Office hours', cells: [NO, YES, YES] },
  { label: 'Saved searches · daily digest', cells: [NO, YES, YES] },
  { label: 'ATS export · analytics', cells: [NO, NO, YES] },
];

export const peopleRows: PlanRow[] = [
  { label: 'Interview, portrait page, sources', cells: [YES, YES] },
  { label: 'Being found · requests · coffee chats', cells: [YES, YES] },
  { label: 'Feed, aliases, events', cells: [YES, YES] },
  { label: 'Themes', cells: ['3 presets', 'More · custom domain'] },
  { label: 'Which companies viewed you', cells: [NO, YES] },
  { label: 'PDF résumé from your portrait', cells: [NO, YES] },
  { label: 'Office-hours bookings a week', cells: ['2', '4'] },
];

export const plainAnswers: { q: string; a: string }[] = [
  {
    q: 'Do job seekers ever pay to be seen?',
    a: 'No. If a startup ever pays for a featured slot, it’s labeled as paid, every time.',
  },
  {
    q: 'What happens when requests run out?',
    a: 'You’ll see it where you write the request. Wait for next month or upgrade — nothing else on the page is locked, and your draft keeps.',
  },
  {
    q: 'Can I cancel?',
    a: 'Any time, from billing. If a payment fails, you get seven days before anything changes.',
  },
];
