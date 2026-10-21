import type { Claim, Spec } from '@/lib/portrait/spec';
import type { Source } from './sources';

// The interview planner (docs/agent-design.md §4.2, §4.3): plain code that reads the portrait and
// says what it still lacks, so the model sees the gaps, not only what is there. Its note rides on
// each of the person's messages as an <interview_plan> block; the model still decides what to
// ask, and answering what the person just said comes first.

export const PLAN_TAG = '<interview_plan>';

const STAGES = {
  skeleton: 'get two or three of their most representative experiences onto the page quickly',
  deepen: 'dig into results, scale and their own part in the experiences already drawn',
  distinct: 'find how they work and what drives them, through stories',
  intent: 'pin down what they are looking for next',
  ready: 'the portrait covers the basics: polish the headline and fill what they care about',
} as const;

const hasNumber = (c: Claim) => /\d/.test(c.statement);
const name = (c: Claim) => c.title ?? c.statement.slice(0, 40);

/** What the interview should look for next, as the note the model reads. */
export function plan(spec: Spec, sources: Source[]): string {
  const live = spec.claims.filter((c) => c.status !== 'rejected');
  const of = (layer: Claim['layer']) => live.filter((c) => c.layer === layer);
  const experiences = of('experience');
  const thin = experiences.filter((c) => !hasNumber(c));

  const stage: keyof typeof STAGES =
    experiences.length < 2 ? 'skeleton' : thin.length ? 'deepen' : !of('trait').length ? 'distinct' : !of('intent').length ? 'intent' : 'ready';

  const gaps = [
    !of('identity').length && 'who they are now: school, degree and year, or current role',
    experiences.length < 2 && 'another experience they are proud of: a project, internship, job or activity',
    ...thin.slice(0, 2).map((c) => `a result, scale or number for "${name(c)}" (a range is fine), or their own part in it`),
    !of('intent').length && 'what role they want next, and where',
    experiences.length >= 2 && !of('capability').length && 'the skills their stories show',
    experiences.length >= 2 && !of('trait').length && 'how they work or what drives them, through a story',
    !spec.headline && live.length >= 4 && 'a headline resting on the strongest lines',
  ].filter((g): g is string => !!g);

  const waiting = live.filter((c) => c.status === 'draft').length;
  return [
    PLAN_TAG,
    'Written by the app from the portrait, not by the person. A guide, not a script.',
    `Stage: ${stage}: ${STAGES[stage]}.`,
    gaps.length ? `Still missing, most useful first:\n${gaps.slice(0, 3).map((g) => `- ${g}`).join('\n')}` : 'Nothing basic is missing.',
    `Lines: ${live.length} (${waiting} waiting for them to confirm on the page).`,
    sources.length
      ? `Documents they shared (read_source looks inside one):\n${sources.map((s) => `- ${s.id}: ${s.name} (${s.kind}${s.pages.length > 1 ? `, ${s.pages.length} pages` : ''})`).join('\n')}`
      : null,
    '</interview_plan>',
  ]
    .filter(Boolean)
    .join('\n');
}
