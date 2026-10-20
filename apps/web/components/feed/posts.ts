// S09 feed fixtures, from the board's DCLogic. Aliases and the company are fictional.

export type FeedPost = {
  id: string;
  who: string;
  ctx: string;
  title: string;
  body: string;
  /** A code line shown under the body (project posts). */
  code?: string;
  meta: string;
  /** Resonate count before the viewer's own. */
  n: number;
  /** Comments. */
  c: number;
};

export const feedPosts: FeedPost[] = [
  {
    id: 'a',
    who: 'quiet-otter',
    ctx: 'CS · junior · Southern California · 2h',
    title: 'What move-in week did to my side project’s database',
    body: '2,000 students tried to list dorm furniture on the same afternoon. Here’s the timeline, the two fixes that worked, and the one that made it worse.',
    meta: 'Post-mortem · 6 min read · slow-query log attached',
    n: 41,
    c: 9,
  },
  {
    id: 'b',
    who: 'night-heron',
    ctx: 'Self-taught · frontend · 5h · project',
    title: 'form-kit: accessible forms without the boilerplate',
    body: 'Three nonprofits use it for intake forms. v2 adds error messages a screen reader actually reads out.',
    code: '<Field label="Email" error="Check the @" />',
    meta: 'github.com/[handle]/form-kit · React · accessibility',
    n: 63,
    c: 14,
  },
  {
    id: 'c',
    who: 'Northwind',
    ctx: 'Company · seed · 6 people · verified · 1d',
    title: 'AMA Thursday: what does an intern actually do here?',
    body: 'Questions welcome ahead of time — aliases are fine. Dana will walk through a real intern project from last summer.',
    meta: 'Thu Oct 29 · 6 PM PT · 64 going',
    n: 22,
    c: 5,
  },
  {
    id: 'd',
    who: 'slow-comet',
    ctx: 'Stats · senior · Midwest · 1d · asking',
    title: 'Has anyone turned a lab dashboard into a portfolio piece without sharing the lab’s data?',
    body: 'I can’t show the real numbers. Thinking of rebuilding it on a public dataset with the same shape.',
    meta: '3 answers so far',
    n: 8,
    c: 3,
  },
];

/** The draft in the composer: Maya posting under their alias. */
export const DRAFT_TEXT =
  'Redesigning a clinic check-in kiosk with the people who use it — six rounds of testing at the front desk.';
