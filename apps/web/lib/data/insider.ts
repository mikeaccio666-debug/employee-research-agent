// Fixture data for the insider screens (Jordan Lee at Fernway), copied from the canvas:
// S18 insider home and S01b-Agent-Insider (Insider › Requests).
import { routes } from '@/lib/routes';

/* ── S18 · insider home ────────────────────────────────────────────── */

export type InsiderRequest = {
  id: string;
  who: string;
  ctx: string;
  line: string;
  /** what they ask for, shown as a chip */
  ask: string;
  more: string;
  integrity: string;
  cta: string;
  href: string;
};

export const insiderRequests: InsiderRequest[] = [
  {
    id: 'R-01',
    who: 'night-heron',
    ctx: 'self-taught frontend · New York',
    line: 'Left a biology lab to build the tools it never had.',
    ask: 'Referral',
    more: 'Packaged for Fernway’s frontend new-grad role. Identity and form-kit are verified; lab years and the bootcamp are still in review and marked that way in the packet. You have a chat booked Oct 28 — read the packet now and decide after.',
    integrity: 'Integrity 4.8 from 5 reviews · portrait matched the person 4 of 5 times',
    cta: 'Read referral packet',
    href: routes.packet,
  },
  {
    id: 'R-02',
    who: 'paper-kite',
    ctx: 'interaction design · new grad',
    line: 'Designs with the people at the counter, not just for them.',
    ask: 'Coffee chat',
    more: 'Asked how Fernway hands designs to engineers. Booked Wed 5:00 PM.',
    integrity: 'Integrity 5.0 from 3 reviews',
    cta: 'Open the chat',
    href: routes.inbox,
  },
  {
    id: 'R-03',
    who: 'field-vole',
    ctx: 'CS junior',
    line: 'Built the mobile app and API for a student bank club.',
    ask: 'Review',
    more: 'Wants a résumé look before applying anywhere. Not packaged for a referral.',
    integrity: 'Too few reviews to show a score yet',
    cta: 'Offer 15 minutes',
    href: routes.insiderRequests,
  },
];

/** A cell of the referral log: `muted` cells are drawn in ink-2, `band` in gold chalk. */
export type LogCell = { t: string; muted?: boolean; band?: boolean };
export type LogRow = { person: string; chat: LogCell; referred: LogCell; outcome: LogCell };

export const referralLogColumns = ['Person', 'Coffee chat', 'Referred', 'Outcome'] as const;

export const referralLog: LogRow[] = [
  { person: 'night-heron', chat: { t: 'Booked · Oct 28' }, referred: { t: '—', muted: true }, outcome: { t: '—', muted: true } },
  { person: 'slow-comet', chat: { t: 'Oct 9' }, referred: { t: 'Oct 12 · data intern' }, outcome: { t: 'Interviewing' } },
  { person: 'Priya N.', chat: { t: 'Sep 18' }, referred: { t: 'Sep 20 · SWE new grad' }, outcome: { t: 'Offer' } },
  { person: 'Marco D.', chat: { t: 'Jun 3' }, referred: { t: 'Jun 5 · SWE intern' }, outcome: { t: 'Hired', band: true } },
  {
    person: 'low-tide',
    chat: { t: 'Sep 4' },
    referred: { t: 'Not referred', muted: true },
    outcome: { t: 'Your call · noted privately', muted: true },
  },
];

/** Coffee-chat hours. The open slot reads "Paused" while hours are paused. */
export type ChatHour = { when: string; booked?: string };

export const chatHours: ChatHour[] = [
  { when: 'Wed · 5:00 PM PT', booked: 'Booked · paper-kite' },
  { when: 'Wed · 5:40 PM PT', booked: 'Booked · night-heron' },
  { when: 'Fri · 12:00 PM PT' },
];

/* ── S01b · Insider › Requests ─────────────────────────────────────── */

export type QueuedRequest = { id: string; who: string; ctx: string; quote: string; asks: string; chip: string };

export const requestQueue: QueuedRequest[] = [
  {
    id: 'R-01',
    who: 'night-heron',
    ctx: 'self-taught frontend · New York',
    quote: '“Could you refer me for the frontend intern role? My form library is used by three nonprofits.”',
    asks: 'Asks for: referral · Oct 17',
    chip: 'Referral',
  },
  {
    id: 'R-02',
    who: 'paper-kite',
    ctx: 'interaction design · new grad',
    quote: '“How does Fernway hand off designs to engineers? I’d love 20 minutes.”',
    asks: 'Asks for: 20-min chat · Oct 18',
    chip: 'Coffee chat',
  },
  {
    id: 'R-03',
    who: 'field-vole',
    ctx: 'CS junior',
    quote: '“Can you look over my resume before I apply anywhere?”',
    asks: 'Asks for: resume review · Oct 18',
    chip: 'Review',
  },
];

/** Wednesday slots offered to paper-kite (Pacific). 5:20 is already taken. */
export type ReplySlot = { key: string; label: string; held: string; taken?: boolean; aria?: string };

export const replySlots: ReplySlot[] = [
  { key: '500', label: '5:00 PM', held: 'Wed 5:00 PM' },
  { key: '520', label: '5:20', held: 'Wed 5:20 PM', taken: true, aria: '5:20 PM, taken' },
  { key: '540', label: '5:40 PM', held: 'Wed 5:40 PM' },
];
