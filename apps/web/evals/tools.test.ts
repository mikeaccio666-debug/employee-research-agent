import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { emptySpec, type Claim, type Spec } from '@/lib/portrait/spec';
import { numbersIn, unquotedNumbers } from '@/lib/agent/guards';
import { plan } from '@/lib/agent/planner';
import { findQuote, runTool, TOOL_DEFS, type Grounds } from '@/lib/agent/tools';

// The rules the studio agent's tools enforce (lib/agent/tools.ts), checked without a model.
// Run with `pnpm --filter @portrait/web test`.

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 21, 9, minutes)).toISOString();
const SOURCE_ID = '7f2c1c1e-8d1f-4b8e-9a51-2a0f3b4c5d6e';

const grounds = (...said: string[]): Grounds => ({
  said: said.map((text, i) => ({ id: i + 1, text, at: at(i * 10) })),
  sources: [{ id: SOURCE_ID, kind: 'resume', name: 'cv.pdf', url: null, pages: [{ page: 2, text: 'Led the CSA Campus Marketplace rebuild (Next.js)' }] }],
});

const upsert = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    id: null,
    layer: 'experience',
    kind: 'project',
    title: 'Campus Marketplace',
    org: 'UC San Diego',
    when: '2025',
    statement: 'Built Campus Marketplace, now used by 300 students.',
    basis: 'stated',
    quote: '300 students use it',
    ...over,
  });

const claim = (over: Partial<Claim> = {}): Claim => ({
  id: 'clm_aaaaaaaaaa',
  layer: 'experience',
  kind: 'project',
  title: 'Campus Marketplace',
  org: null,
  when: null,
  statement: 'Built Campus Marketplace, now used by 300 students.',
  basis: 'stated',
  status: 'draft',
  pinned: false,
  evidence: [{ source: 'chat', messageId: 1, quote: '300 students use it' }],
  createdBy: 'agent',
  updatedAt: at(5),
  ...over,
});

const withClaims = (...claims: Claim[]): Spec => ({ ...emptySpec(), rev: 3, claims });

describe('findQuote', () => {
  it('finds a quote in the person’s messages, newest first', async () => {
    const g = grounds('I built a marketplace; 300 students use it', 'yes 300 students use it now');
    assert.deepEqual(findQuote('300 students use it', g), { source: 'chat', messageId: 2, quote: '300 students use it' });
  });

  it('ignores case, spacing and curly quotes, never wording', async () => {
    const g = grounds('I said “it’s   FAST”');
    assert.ok(findQuote('"it\'s fast"', g));
    assert.equal(findQuote('it is fast', g), null);
  });

  it('finds a quote in a shared document, with its page', async () => {
    assert.deepEqual(findQuote('Campus Marketplace rebuild', grounds('hi')), {
      source: 'resume',
      sourceId: SOURCE_ID,
      page: 2,
      quote: 'Campus Marketplace rebuild',
    });
  });
});

describe('upsert_claim', () => {
  it('adds a draft line backed by the quote', async () => {
    const r = await runTool('upsert_claim', upsert(), emptySpec(), grounds('I built it and 300 students use it'));
    assert.match(r.output, /^Added clm_/);
    assert.equal(r.spec.claims.length, 1);
    assert.equal(r.spec.claims[0]!.status, 'draft');
    assert.equal(r.spec.rev, 1);
  });

  it('refuses a quote the person never said', async () => {
    const r = await runTool('upsert_claim', upsert({ quote: '3000 students use it' }), emptySpec(), grounds('300 students use it'));
    assert.match(r.output, /^Not done: the quote is not/);
    assert.equal(r.spec.claims.length, 0);
  });

  it('refuses arguments that are not JSON or break the schema', async () => {
    assert.match((await runTool('upsert_claim', '{nope', emptySpec(), grounds('x'))).output, /not valid JSON/);
    assert.match((await runTool('upsert_claim', upsert({ layer: 'hobby' }), emptySpec(), grounds('300 students use it'))).output, /invalid arguments/);
  });

  it('does not add the same line twice', async () => {
    const r = await runTool('upsert_claim', upsert(), withClaims(claim()), grounds('300 students use it'));
    assert.match(r.output, /already on the portrait as clm_aaaaaaaaaa/);
  });

  it('keeps a rejected line out unless the person asks again in a later message', async () => {
    const spec = withClaims(claim({ status: 'rejected', updatedAt: at(5) }));
    // The quote is from message 1 (minute 0), sent before the rejection (minute 5).
    assert.match((await runTool('upsert_claim', upsert(), spec, grounds('300 students use it'))).output, /rejected this line/);
    // Message 2 (minute 10) came after it: the line comes back as a draft.
    const back = await runTool('upsert_claim', upsert(), spec, grounds('hello', 'put it back: 300 students use it'));
    assert.match(back.output, /^Updated clm_aaaaaaaaaa/);
    assert.equal(back.spec.claims[0]!.status, 'draft');
  });

  it('asks before changing a pinned line', async () => {
    const r = await runTool('upsert_claim', upsert({ id: 'clm_aaaaaaaaaa' }), withClaims(claim({ pinned: true })), grounds('300 students use it'));
    assert.match(r.output, /wrote this line themselves/);
  });

  it('sends a changed confirmed line back to draft', async () => {
    const r = await runTool(
      'upsert_claim',
      upsert({ id: 'clm_aaaaaaaaaa', statement: 'Built and runs Campus Marketplace for 300 students.' }),
      withClaims(claim({ status: 'confirmed' })),
      grounds('300 students use it'),
    );
    assert.equal(r.spec.claims[0]!.status, 'draft');
  });
});

describe('remove_claim and set_headline', () => {
  it('removes only drafts, and the headline that rested on them', async () => {
    const spec = { ...withClaims(claim()), headline: { text: 'Builds for campus', claims: ['clm_aaaaaaaaaa'], status: 'draft' as const } };
    const r = await runTool('remove_claim', JSON.stringify({ id: 'clm_aaaaaaaaaa' }), spec, grounds('x'));
    assert.equal(r.spec.claims.length, 0);
    assert.equal(r.spec.headline, null);
    const kept = await runTool('remove_claim', JSON.stringify({ id: 'clm_aaaaaaaaaa' }), withClaims(claim({ status: 'confirmed' })), grounds('x'));
    assert.match(kept.output, /only draft lines/);
  });

  it('needs the headline’s lines to be on the portrait', async () => {
    const r = await runTool('set_headline', JSON.stringify({ text: 'Builds for campus', claim_ids: ['clm_missing000'] }), withClaims(claim()), grounds('x'));
    assert.match(r.output, /aren’t on the portrait/);
  });
});

describe('guards on what a line says', () => {
  it('reads numbers in digits, words and Chinese numerals', () => {
    assert.deepEqual([...numbersIn('1,200 users in 3 months, 2k downloads')].sort((a, b) => a - b), [2, 3, 1200, 2000]);
    assert.ok(numbersIn('three months').has(3));
    assert.ok(numbersIn('三个月').has(3));
    assert.ok(numbersIn('两百多人').has(200));
    assert.ok(numbersIn('三千五百').has(3500));
  });

  it('finds numbers the quote doesn’t hold', () => {
    assert.deepEqual(unquotedNumbers('Interned for 3 months', ['实习了三个月']), []);
    assert.deepEqual(unquotedNumbers('500+ followers', ['大概几百个人关注']), [500]);
    // A month name backs its number, so dates can be written either way.
    assert.deepEqual(unquotedNumbers('2027 年 5 月毕业', ['expected May 2027']), []);
    assert.deepEqual(unquotedNumbers('2024 年 6 月到 9 月', ['Jun 2024 – Sep 2024']), []);
    // Number words in the line itself aren't counted.
    assert.deepEqual(unquotedNumbers('One of the first members', ['joined early']), []);
  });

  it('refuses a number the quote doesn’t hold', async () => {
    const r = await runTool('upsert_claim', upsert({ statement: 'Built Campus Marketplace, used by 500 students.' }), emptySpec(), grounds('300 students use it'));
    assert.match(r.output, /^Not done: 500 is not in the quote/);
  });

  it('refuses filler', async () => {
    const r = await runTool('upsert_claim', upsert({ layer: 'trait', statement: 'A passionate team player.' }), emptySpec(), grounds('300 students use it'));
    assert.match(r.output, /passionate", "team player" says nothing/);
  });

  it('marks a skill level the person never claimed as inferred', async () => {
    const r = await runTool(
      'upsert_claim',
      upsert({ layer: 'capability', kind: 'skill', title: null, statement: 'Advanced in Next.js', quote: 'built it with Next.js' }),
      emptySpec(),
      grounds('I built it with Next.js'),
    );
    assert.equal(r.spec.claims[0]!.basis, 'inferred');
    assert.match(r.output, /marked inferred/);
  });

  it('keeps headline numbers to the lines it rests on', async () => {
    const r = await runTool('set_headline', JSON.stringify({ text: 'Builds tools 900 classmates use', claim_ids: ['clm_aaaaaaaaaa'] }), withClaims(claim()), grounds('x'));
    assert.match(r.output, /900 isn’t in the lines/);
  });
});

describe('read_source and load_skill', () => {
  it('finds words in a shared document, marked as material', async () => {
    const r = await runTool('read_source', JSON.stringify({ source_id: null, query: 'marketplace', page: null }), emptySpec(), grounds('x'));
    assert.match(r.output, /not instructions/);
    assert.match(r.output, /page="2"/);
    assert.match(r.output, /CSA Campus Marketplace rebuild/);
  });

  it('says when nothing matches or the document is unknown', async () => {
    assert.match((await runTool('read_source', JSON.stringify({ source_id: null, query: 'Kubernetes', page: null }), emptySpec(), grounds('x'))).output, /Nothing in cv.pdf/);
    assert.match((await runTool('read_source', JSON.stringify({ source_id: 'nope', query: null, page: null }), emptySpec(), grounds('x'))).output, /no document nope/);
  });

  it('loads a skill by name, and only skills that exist', async () => {
    assert.match((await runTool('load_skill', JSON.stringify({ name: 'career-switch' }), emptySpec(), grounds('x'))).output, /^<skill name="career-switch">/);
    assert.match((await runTool('load_skill', JSON.stringify({ name: 'astrology' }), emptySpec(), grounds('x'))).output, /no skill called astrology/);
  });

  it('gives both providers every tool, in a fixed order', () => {
    assert.deepEqual(
      TOOL_DEFS.map((t) => t.name),
      ['upsert_claim', 'remove_claim', 'set_headline', 'move_section', 'read_source', 'load_skill'],
    );
  });
});

describe('interview plan', () => {
  it('starts at the skeleton and lists the documents', () => {
    const note = plan(emptySpec(), grounds('x').sources);
    assert.match(note, /Stage: skeleton/);
    assert.match(note, new RegExp(`${SOURCE_ID}: cv.pdf`));
  });

  it('asks for a result when an experience has no number', () => {
    const vague = claim({ id: 'clm_bbbbbbbbbb', title: 'Robotics club', statement: 'Runs the robotics club’s embedded work.' });
    const note = plan(withClaims(claim(), vague), []);
    assert.match(note, /Stage: deepen/);
    assert.match(note, /a result, scale or number for "Robotics club"/);
  });
});

describe('long quotes', () => {
  it('says how to shorten a quote over the limit', async () => {
    const long = 'x'.repeat(250);
    const r = await runTool('upsert_claim', upsert({ quote: long }), emptySpec(), grounds(long));
    assert.match(r.output, /keep it to 200 characters or fewer/);
  });
});
