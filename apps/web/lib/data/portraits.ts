// Portrait pages (S02): the copy and fixture data from the boards V2-S02-Portrait,
// V2-S02-Portrait-Mobile, V2-S02-Portrait-Maya and V2-S02-Share-Cards.
//
// The anonymous view is built here as its own object, so a page rendered from it never
// receives the real name, handle or photo — nothing is hidden with CSS. Its keys travel
// to the browser with it, so key names stay clear of the names too (no "...Line", "...Lines"):
// a plain search of the anonymous page for the first name then finds nothing at all.
// Strings use **double asterisks** for the bold runs the boards set in <b>.
import type { Basis } from '@portrait/ui';

export type PortraitMode = 'public' | 'anonymous';

/** Text that may hold **bold** runs. */
export type Rich = string;

export type Proof = { basis: Basis; text: Rich; meta: string };
export type Skill = { key: string; label: string; proofs: number; proof: Proof[] };
/** A source that grows open under a footnote. */
export type Source = { basis: Basis; meta: string; quote?: Rich };
/** A run of a sentence, ending in footnote `fn` when set; `src` names its source when it differs from `fn`. */
export type Run = { text: string; fn?: number; src?: number };
export type ExpLine = { label: string; text: string; fn?: number };
export type ExperienceRow = {
  key: string;
  years: string;
  title: string;
  summary: string;
  proofs: number;
  lines: ExpLine[];
  /** Side column: basis marker + text, then optional tags. */
  basis: Basis;
  basisText: string;
  tags?: string;
};
export type Topic = { key: string; label: string; about: string };
export type SlotOption = { key: string; label: string; short: string };
export type Ask = {
  topics: Topic[];
  slots: SlotOption[];
  /** Slots toggle off when picked again (S02) or always keep one picked (Maya). */
  slotToggles: boolean;
  defaultSlot?: string;
  /** Sentence after "About {topic}." once booked. */
  bookedNote: string;
};
export type LatelyItem = { verb: string; text: string; when: string };
export type HowItem = { title: string; text: string };
export type Photo = {
  /** Text inside the placeholder, as drawn. */
  note: string;
  /** The person's own caption under it. */
  caption: string;
  /** Name of the photo on phones, where the caption sits inside it. */
  label: string;
};
export type Voice = {
  /** Desktop label at rest and while playing. */
  idle: string;
  playing?: string;
  /** Phone label at rest; while playing the phone counts the seconds. */
  phoneIdle: string;
  /** Pause glyph on the desktop button (the phone draws ❚❚). */
  pause: string;
};
export type OpenTo = { title: string; lines: string[]; phoneSummary?: string };

type Shared = {
  mode: PortraitMode;
  /** Address shown in the phone bar, e.g. "portrait.so/lin". Public only. */
  address?: string;
  now: string;
  nowDate: string;
  byline: string;
  name: string;
  /** How the page refers to the person: first name, or the alias. */
  who: string;
  photo?: Photo;
  voice?: Voice;
  openTo: OpenTo;
  headline: string;
  skills: { lab: string; phoneLab: string; items: Skill[] };
  experience: ExperienceRow[];
  how: { lab: string; items: HowItem[] };
  you: { lab: string; items: string[]; viewing: string };
  ask: Ask & { lab: string };
  lately: LatelyItem[];
};

/** S02 — Lin's portrait: a story that grows in place, footnoted. */
export type StoryPortraitData = Shared & {
  /** Phone, anonymous: the Now line without the app's name. */
  phoneNow?: string;
  /** Phone, anonymous: the label above the alias. */
  phoneLab?: string;
  anon?: { title: string; text: string; phoneText: string };
  /** The phone caption only exists on the public view; the anonymous phone shows no quote. */
  quote: { en: string; zh: string; caption: string; phoneCaption?: string };
  story: {
    lab: string;
    date: string;
    headline: string;
    paragraphs: Run[][];
    /** Phones tell it in three short lines (S02-Mobile, phone 2). */
    phoneRuns: Run[];
    read: string;
    phoneBar: string;
  };
  sources: Record<number, Source>;
  work: { img: string; wall?: boolean; title: string; sub: string; href: 'experience' | 'feed' }[];
  lookingFor: { text: string; note: string };
  vouch: { lab: string; quote: string; by: string };
  /** Phone, anonymous: the startup view on the third phone of S02-Mobile. */
  startup?: {
    back: string;
    frame: string;
    askLab: string;
    topics: { label: string; short: string }[];
    youLab: string;
    you: string;
    note: string;
    uses: string;
    sent: string;
  };
};

const VIEWING = 'Viewing as Jordan Lee · Fernway';
const WEEKLY = 'Oct 17 · this week';

/** Lin's portrait (V2-S02-Portrait), public or anonymous. */
export function storyPortrait(mode: PortraitMode): StoryPortraitData {
  const anon = mode === 'anonymous';
  // Names live only on the public branch of each line.
  const who = anon ? 'quiet-otter' : 'Lin';
  const she = anon ? 'they' : 'she';

  return {
    mode,
    address: anon ? undefined : 'portrait.so/lin',
    now: 'Now · moving Campus Marketplace to TypeScript',
    nowDate: WEEKLY,
    phoneNow: anon ? 'Now · moving a campus app to TypeScript' : undefined,
    byline: anon ? 'CS · Junior · Bay Area' : '@lin · UC San Diego · Computer science, junior',
    phoneLab: anon ? 'Anonymous · CS junior' : undefined,
    name: anon ? 'quiet-otter' : 'Lin Zhou',
    who,
    photo: anon
      ? undefined
      : { note: 'Photo · chosen by Lin', caption: 'move-in week, 2 a.m.', label: 'Photo chosen by Lin' },
    voice: anon
      ? undefined
      : { idle: 'Hear Lin say hi · 0:15', playing: 'Playing · 0:15', phoneIdle: '15 s · in her voice', pause: 'II' },
    anon: anon
      ? {
          title: 'No photo, no voice',
          text: 'Anonymous portraits never show a face or a voice. Everything below still links to its source.',
          phoneText: 'Anonymous portraits never show a face or a voice. Everything else still links to its source.',
        }
      : undefined,
    openTo: {
      title: 'Open to summer 2027 internships',
      lines: ['Backend · full-stack', 'San Diego · Bay Area · remote'],
      phoneSummary: 'Backend · full-stack · San Diego, Bay Area or remote',
    },
    headline: 'Builds the thing first, then finds out who needed it.',
    quote: {
      en: '“I’m not great at introducing myself. I’d rather show you what I made.”',
      zh: '“我不太会介绍自己，但我可以给你看我做的东西。”',
      caption: anon ? 'Their words, from chat · shared with their OK' : 'Lin’s words, from chat · shared with her OK',
      phoneCaption: anon ? undefined : 'Lin, in chat · Oct 12 ·',
    },
    story: {
      lab: anon ? 'Their story' : 'Her story',
      date: 'updated Oct 17',
      headline: 'Learned backend by keeping a real app alive for 2,000 students.',
      paragraphs: [
        [
          {
            text: anon
              ? 'quiet-otter is a third-year computer science student who never took a backend class — they just had to keep their app from falling over.'
              : 'Lin is a third-year computer science student at UC San Diego who never took a backend class — she just had to keep her app from falling over.',
            fn: 1,
          },
        ],
        [
          { text: `Campus Marketplace, the trading app ${she} built, is used by more than 2,000 students.`, fn: 2 },
          {
            text: anon
              ? ' They learn fastest by shipping something small and watching what people do with it.'
              : ' She learns fastest by shipping something small and watching what people do with it.',
            fn: 3,
          },
        ],
      ],
      phoneRuns: [
        { text: `Campus Marketplace, the trading app ${she} built, is used by more than 2,000 students.`, fn: 1, src: 2 },
        {
          text: anon
            ? 'They didn’t take a backend class. They had to keep it from falling over.'
            : 'She didn’t take a backend class. She had to keep it from falling over.',
          fn: 2,
          src: 1,
        },
        {
          text: anon
            ? 'They learn fastest by shipping something small and watching what people do with it.'
            : 'She learns fastest by shipping something small and watching what people do with it.',
          fn: 3,
          src: 3,
        },
      ],
      read: anon ? 'Read their story' : 'Read her story',
      phoneBar: 'Story · updated Oct 17',
    },
    sources: {
      1: {
        basis: 'said',
        meta: 'Said in chat · turn 3 · Oct 12',
        quote: '“I didn’t take a backend class. I just had to keep it from falling over.”',
      },
      2: {
        basis: 'shown',
        meta: 'Résumé, p.1 · Oct 12',
        quote: '“Campus Marketplace — 2,000+ weekly users; owned backend and dispatch.”',
      },
      3: {
        basis: 'said',
        meta: 'Said in chat · turn 9 · Oct 12',
        quote: '“I ship a small version in a weekend and watch what people actually do with it.”',
      },
      // The board draws footnotes 4–6 without sources; they open the proof the page already lists.
      4: { basis: 'shown', meta: 'Shown · link', quote: '**Move-in week write-up** — slow-query log and p95 before/after.' },
      5: { basis: 'shown', meta: 'Shown · link', quote: '**Move-in week write-up** — slow-query log and p95 before/after.' },
      6: { basis: 'said', meta: 'Said · résumé' },
    },
    skills: {
      lab: 'Good at · each line is one proof, tap to see it',
      phoneLab: 'Good at · tap for the proof',
      items: [
        {
          key: 'load',
          label: 'Ships under real load',
          proofs: 3,
          proof: [
            { basis: 'shown', text: '**Move-in week write-up** — slow-query log and p95 before/after.', meta: 'Shown · link' },
            { basis: 'ver', text: '**214 commits** in campus-marketplace since Sep 2025.', meta: 'Verified · GitHub' },
            { basis: 'shown', text: '**2,000+ weekly users.**', meta: 'Résumé, p.1' },
          ],
        },
        {
          key: 'logs',
          label: 'Debugs from the logs up',
          proofs: 2,
          proof: [
            {
              basis: 'shown',
              text: '**Three public post-mortems** since 2025; the latest has 41 resonances.',
              meta: 'Shown · feed',
            },
            { basis: 'said', text: '“I read the slow-query log before I guess.”', meta: 'Chat, turn 6' },
          ],
        },
        {
          key: 'draw',
          label: 'Explains with drawings',
          proofs: 2,
          proof: [
            { basis: 'said', text: '“I answer ‘how does it work’ with a drawing.”', meta: 'Chat, turn 11' },
            {
              basis: 'ver',
              text: '**Jamie Park**, hackathon teammate: “She sketched the whole bot on a napkin first.”',
              meta: 'Vouched · verified',
            },
          ],
        },
      ],
    },
    experience: [
      {
        key: 'e1',
        years: '2025 — now',
        title: 'Campus Marketplace · founder & backend',
        summary: 'Kept a 2,000-student app up through move-in week.',
        proofs: 3,
        lines: [
          {
            label: 'Context',
            text: `A second-hand trading app for students on ${anon ? 'a large public campus' : 'UC San Diego'}, run by ${who} and one friend since fall 2025.`,
          },
          {
            label: 'Decision',
            text: `When Postgres ran out of connections, ${she} cached listings for 30 seconds and queued photo uploads instead of buying a bigger database.`,
            fn: 4,
          },
          { label: 'Result', text: 'p95 load time 1.8 s → 240 ms. No outage since.', fn: 5 },
        ],
        basis: 'shown',
        basisText: '3 proofs',
        tags: 'Go · PostgreSQL · Redis',
      },
      {
        key: 'e2',
        years: '2026 — now',
        title: 'Data Structures tutor',
        summary: 'Runs a weekly section that grew from 12 to 30 students.',
        proofs: 1,
        lines: [
          { label: 'Context', text: 'An optional Thursday section for the intro data-structures course.' },
          { label: 'Decision', text: 'Draws every linked list on the whiteboard before anyone writes code.' },
          { label: 'Result', text: 'Attendance 12 → 30 by week 6.', fn: 6 },
        ],
        basis: 'said',
        basisText: 'Said · résumé',
      },
      {
        key: 'e3',
        years: '2024',
        title: 'Campus hackathon · 2nd place',
        summary: 'A lost-and-found bot, built in 36 hours with two friends.',
        proofs: 2,
        lines: [
          { label: 'Context', text: 'The campus lost-and-found ran on a paper binder.' },
          { label: 'Decision', text: 'A chat bot that matches “lost” and “found” posts by photo and place.' },
          { label: 'Result', text: '2nd of 48 teams. Jamie, a teammate, drew this mark.' },
        ],
        basis: 'ver',
        basisText: 'Verified · Devpost',
      },
    ],
    work: [
      {
        img: `Listing page · screenshot from ${who}`,
        title: 'Campus Marketplace',
        sub: 'App · 2,000+ students',
        href: 'experience',
      },
      {
        img: `Timeline sketch · from ${who}`,
        wall: true,
        title: 'What move-in week did to my database',
        sub: 'Writing · 41 resonated',
        href: 'feed',
      },
    ],
    how: {
      // The board fills "How {{she}} works"; the anonymous line reads "How they work".
      lab: anon ? 'How they work' : 'How she works',
      items: [
        { title: 'Small first', text: 'A weekend version, then watch what people actually do with it.' },
        { title: 'Logs before guesses', text: 'Reads the slow-query log, then writes down what happened.' },
        { title: 'Draws it out', text: 'Answers “how does it work” with a drawing.' },
      ],
    },
    lookingFor: {
      text: 'A summer 2027 backend internship on a team small enough to sit next to the people using it.',
      note: 'Work authorization shared after you connect.',
    },
    you: {
      lab: `You & ${who}`,
      items: [
        anon ? 'Same stack: Go and Postgres' : 'Both UC San Diego · you graduated ’25',
        'Both follow Northwind',
        'You both wrote about Postgres connection pools',
      ],
      viewing: VIEWING,
    },
    ask: {
      lab: `Ask ${who} about`,
      topics: [
        { key: 'pg', label: 'Postgres under load', about: 'Postgres under load' },
        { key: 'two', label: 'Running an app with a friend', about: 'running an app with a friend' },
        { key: 'intl', label: 'CS as an international student', about: 'CS as an international student' },
      ],
      slots: [
        { key: 'wed', label: 'Wed 5:30 PM', short: 'Wed 5:30 PM' },
        { key: 'thu', label: 'Thu 12:00 PM', short: 'Thu 12:00 PM' },
        { key: 'fri', label: 'Fri 4:00 PM', short: 'Fri 4:00 PM' },
      ],
      slotToggles: true,
      bookedNote: 'Invites are on their way to you both. After you meet, this becomes a mark on both your pages.',
    },
    vouch: {
      lab: 'A mark Jamie drew',
      quote: '“She stays after the demo to fix the bug she found during it.”',
      by: 'Jamie Park · hackathon teammate · verified',
    },
    lately: [
      { verb: 'Wrote', text: '“What move-in week did to my database”', when: '41 resonated · 3 days ago' },
      { verb: 'Went to', text: 'Northwind AMA: how a 6-person team ships', when: 'Oct 9' },
      { verb: 'Updated', text: 'Experience', when: '2 days ago' },
    ],
    startup: anon
      ? {
          back: 'Contact sheet',
          frame: '08A · SWE Intern',
          askLab: 'Ask about',
          topics: [
            { label: 'Postgres under load', short: 'Postgres' },
            { label: 'Running an app with a friend', short: 'running an app' },
          ],
          youLab: 'You & quiet-otter',
          you: 'Follows Northwind · wrote about Postgres connection pools',
          note: 'Name, school and work authorization are shared after you connect.',
          uses: 'Uses 1 request · 3 left this month',
          // After sending, as S07 words it.
          sent: 'Sent Oct 19 · quiet-otter decides whether to reveal their name · 2 requests left',
        }
      : undefined,
  };
}

/** S02-Maya — a work-first portrait: each piece of work opens into its case. */
export type WorkPortraitData = Shared & {
  quote: { text: string; caption: string };
  work: {
    lab: string;
    date: string;
    tiles: { key: string; cap: string; title: string; sub: string; meta?: string; proofs?: number }[];
    more: { title: string; text: string };
    kiosk: {
      lab: string;
      date: string;
      headline: string;
      rounds: { n: number; date: string; y: number; text: string; basis: Basis; src: string }[];
      didLab: string;
      did: string[];
      vouch: string;
      vouchBy: string;
    };
    short: Record<string, { lab: string; line: string }>;
    shortNote: string;
  };
  lookingFor: string;
};

export function workPortrait(): WorkPortraitData {
  return {
    mode: 'public',
    address: 'portrait.so/maya',
    now: 'Now · testing kiosk v7 at the front desk',
    nowDate: 'Oct 16 · this week',
    byline: '@maya · interaction design · new grad',
    name: 'Maya Ortiz',
    who: 'Maya',
    photo: { note: 'Photo · chosen by Maya', caption: 'round 4, behind the counter', label: 'Photo chosen by Maya' },
    voice: { idle: '15 s · in her voice', phoneIdle: '15 s · in her voice', pause: '❚❚' },
    openTo: {
      title: 'Open to product design roles, 2027',
      lines: ['Interaction · research', 'New York · Boston · remote'],
    },
    headline: 'Designs with the people at the counter, not just for them.',
    quote: {
      text: '“I have more work than words. Pick one and I’ll walk you through it.”',
      caption: 'Maya, in chat · Oct 13',
    },
    work: {
      lab: 'Work · start here',
      date: 'each one opens into its case',
      tiles: [
        {
          key: 'k',
          cap: 'Kiosk v6 · from Maya',
          title: 'Clinic check-in kiosk',
          sub: 'Four minutes to ninety seconds, after six rounds at the front desk.',
          meta: 'Capstone · 2026',
          proofs: 3,
        },
        { key: 'l', cap: 'Library app · from Maya', title: 'Library hold pickup', sub: 'Fewer missed pickups · summer internship' },
        { key: 'f', cap: 'Form audit · from Maya', title: 'Benefits form, read aloud', sub: 'Screen-reader audit · class project' },
      ],
      more: {
        title: 'Two more without a write-up yet',
        text: 'Maya can walk you through them on a call. Portrait drafts a case from her voice notes when she’s ready.',
      },
      kiosk: {
        lab: 'Case · clinic check-in kiosk',
        date: 'drafted from 3 voice notes · Maya approved Oct 14',
        headline: 'Check-in went from about four minutes to ninety seconds after six rounds at the front desk.',
        rounds: [
          {
            n: 1,
            date: 'Mar 3',
            y: 42,
            text: 'Paper prototype taped to the counter. Patients walked past it and queued for the desk anyway.',
            basis: 'said',
            src: 'Said · voice note 1',
          },
          {
            n: 2,
            date: 'Mar 12',
            y: 34,
            text: 'No more typing: date of birth on a big keypad, everything else a tap.',
            basis: 'shown',
            src: 'Shown · Figma v2',
          },
          {
            n: 3,
            date: 'Mar 24',
            y: 26,
            text: 'Spanish became a choice on the first screen, not a toggle in the corner.',
            basis: 'shown',
            src: 'Shown · Figma v3',
          },
          {
            n: 4,
            date: 'Apr 7',
            y: 18,
            text: 'Front-desk staff can take over any screen with one tap.',
            basis: 'shown',
            src: 'Shown · Figma v4',
          },
          {
            n: 5,
            date: 'Apr 18',
            y: 10,
            text: 'Dropped the printed slip. The staff asked; no patient missed it.',
            basis: 'said',
            src: 'Said · voice note 3',
          },
          {
            n: 6,
            date: 'Apr 28',
            y: 2,
            text: 'Median check-in 90 seconds across 11 patients, down from about four minutes.',
            basis: 'ver',
            src: 'Verified · clinic manager',
          },
        ],
        didLab: 'What Maya did',
        did: [
          'Sat at the desk for a week before drawing anything.',
          'Ran all six rounds with patients and two staff.',
          'Paired with one engineer on the build.',
        ],
        vouch: '“She sat at our front desk for a week before she drew a single screen.”',
        vouchBy: 'Rosa M. · clinic manager · verified',
      },
      short: {
        l: { lab: 'Case · library hold pickup', line: 'Pickup moved into the notice itself, with the branch hours.' },
        f: { lab: 'Case · benefits form, read aloud', line: 'Every field rewritten so a screen reader says what it wants.' },
      },
      shortNote: 'Short case · one screen and two sentences from Maya. Ask her for the rest.',
    },
    skills: {
      lab: 'Good at · each line is one proof, tap to see it',
      phoneLab: 'Good at · tap for the proof',
      items: [
        {
          key: 'people',
          label: 'Tests with the real people',
          proofs: 3,
          proof: [
            { basis: 'shown', text: '**Six rounds at the front desk** — notes and photos from each.', meta: 'Shown · Figma file' },
            { basis: 'ver', text: '**11 patients timed in round 6.**', meta: 'Verified · clinic manager' },
            { basis: 'said', text: '“I don’t trust a design until someone in a hurry has used it.”', meta: 'Voice note 2' },
          ],
        },
        {
          key: 'proto',
          label: 'Prototypes in an afternoon',
          proofs: 2,
          proof: [
            { basis: 'shown', text: '**Paper kiosk taped to the counter**, made in a lunch break.', meta: 'Shown · photo' },
            { basis: 'said', text: '**Library hold flow** clickable by day two.', meta: 'Résumé' },
          ],
        },
        {
          key: 'lang',
          label: 'Designs for two languages',
          proofs: 1,
          proof: [{ basis: 'shown', text: '**Spanish as a first-screen choice**, round 3.', meta: 'Shown · Figma v3' }],
        },
      ],
    },
    experience: [
      {
        key: 'e1',
        years: '2026',
        title: 'Capstone · community clinic',
        summary: 'Redesigned check-in with the people at the desk.',
        proofs: 3,
        lines: [
          { label: 'Context', text: 'A walk-in clinic where the line for the desk was the waiting room.' },
          { label: 'Decision', text: 'Test at the counter every two weeks instead of one big study at the end.' },
          { label: 'Result', text: 'Median check-in about 4 min → 90 s. The kiosk is still in use.' },
        ],
        basis: 'ver',
        basisText: 'Verified · clinic',
      },
      {
        key: 'e2',
        years: 'Summer 2025',
        title: 'Design intern · public library app',
        summary: 'Made hold pickup a two-tap flow.',
        proofs: 1,
        lines: [
          { label: 'Context', text: 'Holds expired on the shelf because people missed the notice.' },
          { label: 'Decision', text: 'Put pickup in the notification itself, with the branch hours.' },
          { label: 'Result', text: 'Shipped in the fall release.' },
        ],
        basis: 'said',
        basisText: 'Said · résumé',
      },
    ],
    how: {
      lab: 'How Maya works',
      items: [
        { title: 'Sit with them first', text: 'A week at the desk before the first sketch.' },
        { title: 'Paper before pixels', text: 'Tape it to the counter and watch.' },
        { title: 'Show the ugly version', text: 'Early and often, to the people who’ll build it.' },
      ],
    },
    lookingFor: 'A product design role in 2027, on a team that ships to people who aren’t designers.',
    you: {
      lab: 'You & Maya',
      items: ['You both went to showcase night · Oct 8', 'You both follow Fernway Design Notes'],
      viewing: VIEWING,
    },
    ask: {
      lab: 'Ask Maya about',
      topics: [
        { key: 'a', label: 'Testing at a front desk', about: 'testing at a front desk' },
        { key: 'b', label: 'Designing for two languages', about: 'designing for two languages' },
        { key: 'c', label: 'Handing designs to engineers', about: 'handing designs to engineers' },
      ],
      slots: [
        { key: 'wed', label: 'Wed 5:00 PM', short: 'Wed 5:00' },
        { key: 'thu', label: 'Thu 9:30 AM', short: 'Thu 9:30' },
      ],
      slotToggles: false,
      defaultSlot: 'wed',
      bookedNote: 'After you meet, this becomes a mark on both your pages.',
    },
    lately: [
      { verb: 'Went to', text: 'Portrait showcase night', when: 'Oct 8' },
      { verb: 'Updated', text: 'Work', when: 'Oct 14' },
    ],
  };
}

/** Public portraits by handle (/@handle). */
export const handles = ['lin', 'maya'] as const;
export type Handle = (typeof handles)[number];
export function isHandle(value: string): value is Handle {
  return (handles as readonly string[]).includes(value);
}

/** Anonymous portraits by alias (/a/alias). Only Lin's anonymous view is drawn. */
export const aliases = ['quiet-otter'] as const;
export function isAlias(value: string): value is (typeof aliases)[number] {
  return (aliases as readonly string[]).includes(value);
}

/** Page titles, from the boards' <title>s. The anonymous page is titled by its alias. */
export const portraitTitles = {
  lin: 'Lin Zhou · Portrait',
  maya: 'Maya Ortiz · work first',
  cards: 'Share cards',
} as const;

/** V2-S02-Share-Cards: three 1200 × 630 cards. */
export const shareCards = {
  named: {
    label: 'Share card, Lin Zhou, named',
    url: 'portrait.so/lin',
    marks: [
      { top: 118, date: 'Oct 17', isNew: true },
      { top: 380, date: '2025', isNew: false },
    ],
    now: 'Now · moving Campus Marketplace to TypeScript',
    name: 'Lin Zhou',
    photo: 'Photo · chosen by Lin',
    line: 'Builds the thing first, then finds out who needed it.',
    pills: [
      { label: 'Ships under real load', proofs: 3 },
      { label: 'Debugs from the logs up', proofs: 2 },
      { label: 'Open to summer 2027' },
    ],
    caption: '实名卡片：名字、Now 状态、照片和一句话，下面是带证据竖线的能力标签。左边门框上的铅笔线标着最近一次更新的日期。照片只在实名卡片上出现。',
  },
  anonymous: {
    label: 'Share card, quiet-otter, anonymous',
    url: 'portrait.so/a/quiet-otter',
    mark: { top: 150, date: 'Oct 17' },
    lab: 'Anonymous · CS junior · open to summer 2027',
    name: 'quiet-otter',
    line: 'Kept a 2,000-student app up through move-in week.',
    stat: 'p95 1.8 s → 240 ms',
    statNote: 'from the slow-query log',
    side: ['No photo · no name', 'Every line links to its source'],
    caption: '匿名卡片（暗色）：只有别名、一句经历和一个能查证的数字。不放照片，也不放学校和城市，避免卡片本身暴露身份。',
  },
  work: {
    label: 'Share card, Maya Ortiz, a piece of work',
    url: 'portrait.so/maya',
    mark: { top: 120, date: 'Oct 14' },
    lab: 'Clinic check-in kiosk · six rounds at the front desk',
    headline: 'Four minutes to ninety seconds.',
    rounds: [18, 28, 38, 48, 58, 68],
    name: 'Maya Ortiz',
    sub: 'Interaction design · new grad · open to 2027 roles',
    caption: '作品卡片：作品优先的人，分享出去的是一件作品，而不是一张名片。六根越来越高的刻度代表六轮测试，最后一根用 Maya 自己的颜色。',
  },
} as const;
