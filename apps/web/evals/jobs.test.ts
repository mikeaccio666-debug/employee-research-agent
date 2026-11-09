import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import sample from '@/lib/jobs/sample-jobs.json';
import { quoteAround, recommend, type Feedback } from '@/lib/jobs/match';
import { filterJobs } from '@/lib/jobs/source';
import { fromJobRecord, type JobRecordV1 } from '@/lib/jobs/thd';
import type { JobPosting } from '@/lib/jobs/types';
import { emptySpec, type Claim, type Spec } from '@/lib/portrait/spec';

// Job recommendations v0 (lib/jobs/match.ts) on the sample catalog: every reason must point at a
// confirmed line and at words that are really in the posting; preferences filter; feedback hides.

const jobs = (sample as { jobs: JobPosting[] }).jobs;
const now = new Date('2026-11-09T12:00:00Z');

let n = 0;
const claim = (layer: Claim['layer'], statement: string, extra: Partial<Claim> = {}): Claim => ({
  id: `clm_test${String(++n).padStart(4, '0')}`,
  layer,
  kind: layer,
  statement,
  title: null,
  org: null,
  when: null,
  basis: 'stated',
  status: 'confirmed',
  pinned: false,
  evidence: [],
  createdBy: 'agent',
  updatedAt: now.toISOString(),
  ...extra,
});

function spec(claims: Claim[], prefs: Partial<Spec['preferences']> = {}): Spec {
  const s = emptySpec();
  return { ...s, claims, preferences: { ...s.preferences, ...prefs } };
}

const analyst = spec(
  [
    claim('experience', 'Built SQL dashboards in Tableau that the finance team used for monthly forecasting', { title: 'Data Analyst Intern', org: 'Acme' }),
    claim('capability', 'Python and pandas for cleaning messy data; A/B test analysis'),
    claim('identity', 'Statistics student at UC Davis, graduating June 2027'),
    claim('capability', 'Rejected line about Kubernetes clusters', { status: 'rejected' }),
  ],
  { roles: ['data analyst'], workAuth: 'F-1, will need sponsorship' },
);

describe('job recommendations', () => {
  it('builds a sample catalog that reads', () => {
    assert.ok(jobs.length > 1000);
    for (const j of jobs) {
      assert.ok(j.id && j.title && j.company.name && j.source.posting_url.startsWith('https://'), j.id);
    }
  });

  it('cites only confirmed lines, with words that are really in the posting', () => {
    const r = recommend(analyst, jobs, [], { now });
    assert.ok(r.items.length > 0, 'some postings fit an analyst');
    const confirmed = new Map(analyst.claims.filter((c) => c.status === 'confirmed').map((c) => [c.id, c]));
    for (const item of r.items) {
      assert.ok(item.reasons.length > 0 && item.reasons.length <= 3);
      for (const reason of item.reasons) {
        if (reason.kind !== 'claim') continue;
        const c = confirmed.get(reason.claimId);
        assert.ok(c, `reason cites a confirmed line (${reason.claimId})`);
        assert.equal(reason.statement, c!.statement);
        assert.ok(`${c!.title ?? ''} ${c!.statement}`.toLowerCase().includes(reason.term.split(' ')[0]!), `term ${reason.term} is the person's`);
        const text = `${item.job.title}\n${item.job.description}`.toLowerCase();
        for (const part of reason.quote.replace(/…/g, '').split(/\s+/).filter((w) => w.length > 3).slice(0, 5)) {
          assert.ok(text.includes(part.toLowerCase()), `quote word "${part}" is in ${item.job.id}`);
        }
        assert.ok(reason.quote.toLowerCase().includes(reason.term), 'the quote holds the matched term');
      }
      assert.ok(!item.reasons.some((x) => x.kind === 'claim' && x.statement.includes('Kubernetes')), 'never a rejected line');
    }
  });

  it('puts analyst roles first and keeps senior roles down for a student', () => {
    const r = recommend(analyst, jobs, [], { now });
    const top = r.items.slice(0, 5).map((i) => i.job.title);
    assert.ok(top.some((t) => /analy/i.test(t)), `an analyst role in the top five: ${top.join(' | ')}`);
    const firstSenior = r.items.findIndex((i) => /\b(senior|staff|principal|director)\b/i.test(i.job.title));
    const firstAnalyst = r.items.findIndex((i) => /analy/i.test(i.job.title));
    assert.ok(firstSenior === -1 || firstAnalyst < firstSenior);
  });

  it('filters on job type, work mode and place', () => {
    const remoteIntern = spec(analyst.claims, { roles: ['engineer'], jobTypes: ['internship'], workModes: ['remote'] });
    const r = recommend(remoteIntern, jobs, [], { now });
    for (const i of r.items) {
      assert.ok(['internship', 'unknown'].includes(i.job.employment_type.normalized), i.job.title);
      assert.ok(['remote', 'unknown'].includes(i.job.workplace_type), i.job.title);
    }
    assert.ok(r.filteredOut > 0);

    const nyc = recommend(spec(analyst.claims, { roles: ['engineer'], locations: ['纽约'] }), jobs, [], { now });
    assert.ok(nyc.items.length > 0);
    for (const i of nyc.items) assert.ok(i.job.workplace_type === 'remote' || i.job.locations.some((l) => /new york|nyc/i.test(l.as_published)), i.job.locations[0]?.as_published);
  });

  it('hides what they dismissed, and the whole company when that was the reason', () => {
    const before = recommend(analyst, jobs, [], { now });
    const first = before.items[0]!.job;
    const once: Feedback[] = [{ jobId: first.id, action: 'dismissed', reason: 'other', company: first.company.name }];
    assert.ok(!recommend(analyst, jobs, once, { now }).items.some((i) => i.job.id === first.id));
    const company: Feedback[] = [{ jobId: first.id, action: 'dismissed', reason: 'company', company: first.company.name }];
    assert.ok(!recommend(analyst, jobs, company, { now }).items.some((i) => i.job.company.name === first.company.name));
    const saved: Feedback[] = [{ jobId: first.id, action: 'saved', reason: null, company: first.company.name }];
    assert.equal(recommend(analyst, jobs, saved, { now }).items.find((i) => i.job.id === first.id)?.action, 'saved');
  });

  it('keeps the words that define a role', () => {
    const pm = spec([], { roles: ['product manager'] });
    const r = recommend(pm, jobs, [], { now });
    assert.ok(r.items.length > 0);
    for (const i of r.items) assert.match(i.job.title, /manag/i, `${i.job.title} is a manager role`);
  });

  it('meets "Engineering" in a title with an "engineer" role', () => {
    const r = recommend(spec([], { roles: ['software engineer'], jobTypes: ['internship'] }), jobs, [], { now });
    assert.ok(r.items.some((i) => /software engineering intern/i.test(i.job.title)), r.items.map((i) => i.job.title).join(' | '));
  });

  it('reads "Remote" as their only place as remote only', () => {
    const r = recommend(spec([], { roles: ['software engineer'], locations: ['Remote'] }), jobs, [], { now });
    assert.ok(r.items.length > 0);
    for (const i of r.items) assert.ok(['remote', 'unknown'].includes(i.job.workplace_type), `${i.job.title}: ${i.job.workplace_type}`);
  });

  it('does not warn someone who needs no sponsorship', () => {
    const bill = jobs.filter((j) => /not eligible for visa sponsorship/i.test(j.description));
    for (const workAuth of ['US citizen, no sponsorship needed', '绿卡', 'Green card holder']) {
      const r = recommend(spec([], { roles: [bill[0]!.title], workAuth }), bill, [], { now });
      assert.ok(r.items.length > 0);
      for (const i of r.items) assert.equal(i.caution, null, workAuth);
    }
  });

  it('warns when a posting says it will not sponsor', () => {
    const bill = jobs.filter((j) => /not eligible for visa sponsorship/i.test(j.description));
    assert.ok(bill.length > 0, 'the sample holds this wording');
    const r = recommend(spec(analyst.claims, { roles: [bill[0]!.title], workAuth: 'F-1, needs sponsorship' }), bill, [], { now });
    assert.ok(r.items.length > 0);
    for (const i of r.items) assert.match(i.caution ?? '', /not eligible for visa sponsorship/i);
  });

  it('asks for a portrait when there is nothing to match on', () => {
    const r = recommend(emptySpec(), jobs, [], { now });
    assert.equal(r.needsPortrait, true);
    assert.equal(r.items.length, 0);
  });

  it('quotes the sentence a term sits in', () => {
    const text = 'About us. We love data. You will write SQL queries every day; and more.';
    assert.equal(quoteAround(text, 'sql'), 'You will write SQL queries every day');
    assert.equal(quoteAround(text, 'mysql'), null);
  });

  it('reads talent-data-hub job records', () => {
    const record: JobRecordV1 = {
      id: '0b9f6c1e-2d3a-4b5c-8d7e-1f2a3b4c5d6e',
      status: 'open',
      source: { system: 'greenhouse', tenant: 'acme', external_id: '1', posting_url: 'https://boards.greenhouse.io/acme/jobs/1', apply_url: null },
      title: 'Data Analyst',
      company: { name: 'Acme', domain: 'acme.com' },
      locations: [{ as_published: 'Remote, US', country: 'US', region: null, city: null }],
      workplace_type: 'fully_remote_someday',
      employment_type: { as_published: 'Full-time', normalized: 'full_time' },
      posted_at: '2026-11-01',
      salary: [{ as_published: '$90,000 – $110,000', min: 90000, max: 110000, currency: 'USD', period: 'fortnight' }],
      description: { html: '<p>You&#39;ll own <b>SQL</b> &amp; dashboards.</p><ul><li>Python</li></ul>' },
      last_verified_at: '2026-11-09T00:00:00Z',
    };
    const job = fromJobRecord(record);
    assert.equal(job.workplace_type, 'unknown', 'a value from the open set we do not know yet');
    assert.equal(job.salary[0]?.period, null);
    assert.equal(job.description, "You'll own SQL & dashboards.\n• Python");
    assert.equal(filterJobs([job], { keywords: ['sql'] }).length, 1);
    assert.equal(filterJobs([job], { employmentTypes: ['internship'] }).length, 0);
  });
});
