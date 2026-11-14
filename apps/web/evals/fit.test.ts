import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import sample from '@/lib/jobs/sample-jobs.json';
import { checkFit, fitInput, readFit } from '@/lib/jobs/fit';
import { NO_SPONSOR } from '@/lib/jobs/match';
import type { JobPosting } from '@/lib/jobs/types';
import { emptySpec, type Claim, type Spec } from '@/lib/portrait/spec';

// The fit check (lib/jobs/fit.ts): the model's answer counts only where it can be checked. A
// requirement must be the posting's own words, and a line must be one the person confirmed.

const jobs = (sample as { jobs: JobPosting[] }).jobs;

let n = 0;
const claim = (statement: string, extra: Partial<Claim> = {}): Claim => ({
  id: `clm_fit${String(++n).padStart(4, '0')}`,
  layer: 'experience',
  kind: 'experience',
  statement,
  title: null,
  org: null,
  when: null,
  basis: 'stated',
  status: 'confirmed',
  pinned: false,
  evidence: [],
  createdBy: 'agent',
  updatedAt: '2026-11-13T00:00:00.000Z',
  ...extra,
});
const spec = (claims: Claim[], workAuth: string | null = null): Spec => {
  const s = emptySpec();
  return { ...s, claims, preferences: { ...s.preferences, workAuth } };
};

/** Three stretches of a posting's own words, far enough apart to be different requirements. */
function quotesOf(job: JobPosting): [string, string, string] {
  const text = job.description.replace(/\s+/g, ' ');
  const at = (from: number) => text.slice(from, from + 60).trim();
  return [at(100), at(400), at(800)];
}
const long = jobs.find((j) => j.description.replace(/\s+/g, ' ').length > 1200)!;

describe('fit check', () => {
  it('keeps only requirements quoted from the posting', () => {
    const sql = claim('Built SQL dashboards the finance team used');
    const [a, b] = quotesOf(long);
    const fit = readFit(
      JSON.stringify({
        requirements: [
          { quote: a, must: true, kind: 'skill', screening: false, line: sql.id },
          { quote: 'Ten years of experience flying helicopters at night', must: true, kind: 'experience', screening: true, line: null },
          { quote: b, must: false, kind: 'other', screening: false, line: null },
          { quote: a.toUpperCase(), must: true, kind: 'skill', screening: false, line: null },
        ],
      }),
      long,
      spec([sql]),
    );
    assert.deepEqual(fit.requirements.map((r) => r.quote), [a, b]);
    assert.deepEqual(fit.must, { total: 1, covered: 1 });
    assert.deepEqual(fit.nice, { total: 1, covered: 0 });
    assert.equal(fit.requirements[0]!.statement, sql.statement);
  });

  it('counts a line only when the person confirmed it', () => {
    const draft = claim('Led a team of five analysts', { status: 'draft' });
    const rejected = claim('Managed a $2M budget', { status: 'rejected' });
    const wish = claim('Wants to move into product management', { layer: 'intent', kind: 'intent' });
    const [a, b, c] = quotesOf(long);
    const fit = readFit(
      JSON.stringify({
        requirements: [
          { quote: a, must: true, kind: 'experience', screening: false, line: draft.id },
          { quote: b, must: true, kind: 'experience', screening: false, line: rejected.id },
          { quote: c, must: true, kind: 'experience', screening: false, line: wish.id },
          { quote: `${a} `, must: true, kind: 'experience', screening: false, line: 'clm_notthere1' },
        ],
      }),
      long,
      spec([draft, rejected, wish]),
    );
    assert.equal(fit.requirements.length, 3);
    assert.deepEqual(fit.must, { total: 3, covered: 0 });
    assert.ok(fit.requirements.every((r) => r.claimId === null && r.statement === null));
  });

  it('never reads the right to work off a portrait line, and flags a posting that will not sponsor', () => {
    const job = jobs.find((j) => NO_SPONSOR.test(j.description));
    assert.ok(job, 'the sample has a posting that says it will not sponsor');
    const text = job.description.replace(/\s+/g, ' ');
    const m = NO_SPONSOR.exec(text)!;
    const quote = text.slice(Math.max(0, m.index - 10), m.index + m[0].length).trim();
    const line = claim('International student at UC Davis');
    const answer = JSON.stringify({ requirements: [{ quote, must: true, kind: 'authorization', screening: false, line: line.id }] });

    const needs = readFit(answer, job, spec([line], 'F-1, will need sponsorship'));
    assert.equal(needs.requirements[0]!.claimId, null);
    assert.equal(needs.requirements[0]!.screening, true);
    // The right to work is not one of the counted requirements.
    assert.deepEqual(needs.must, { total: 0, covered: 0 });
    assert.equal(needs.authorization?.conflict, true);
    assert.equal(needs.authorization?.saved, 'F-1, will need sponsorship');

    assert.equal(readFit(answer, job, spec([line], 'US citizen')).authorization?.conflict, false);
    assert.equal(readFit(answer, job, spec([line])).authorization?.saved, null);
  });

  it('gives the model confirmed lines only, and refuses an answer that is not the JSON asked for', async () => {
    const yes = claim('Automated the weekly revenue report in Python', { title: 'Operations Assistant', org: 'Campus Dining', when: '2021 — now' });
    const no = claim('Fluent in Klingon', { status: 'draft' });
    const s = spec([yes, no], 'F-1, will need sponsorship');
    const input = fitInput(long, s);
    // The dates of a confirmed experience go with it: a years-of-experience requirement rests on them.
    assert.ok(input.includes(yes.id) && input.includes('Operations Assistant, Campus Dining, 2021 — now — Automated'));
    assert.ok(!input.includes(no.id) && !input.includes('Klingon'));
    // Work authorization stays out of what the model reads.
    assert.ok(!input.includes('F-1'));

    await assert.rejects(checkFit(long, s, async () => 'I could not read the posting.'));
    const [a] = quotesOf(long);
    const fit = await checkFit(long, s, async (instructions, text) => {
      assert.ok(instructions.includes('copied exactly') && text === input);
      return `Here you go:\n{"requirements":[{"quote":${JSON.stringify(a)},"must":true,"kind":"skill","screening":false,"line":"${yes.id}"}]}`;
    });
    assert.deepEqual(fit.must, { total: 1, covered: 1 });
  });
});
