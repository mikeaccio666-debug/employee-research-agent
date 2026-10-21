import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { emptySpec, type Claim, type Spec } from '@/lib/portrait/spec';
import { findQuote, runTool, type Grounds } from '@/lib/agent/tools';

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
  it('finds a quote in the person’s messages, newest first', () => {
    const g = grounds('I built a marketplace; 300 students use it', 'yes 300 students use it now');
    assert.deepEqual(findQuote('300 students use it', g), { source: 'chat', messageId: 2, quote: '300 students use it' });
  });

  it('ignores case, spacing and curly quotes, never wording', () => {
    const g = grounds('I said “it’s   FAST”');
    assert.ok(findQuote('"it\'s fast"', g));
    assert.equal(findQuote('it is fast', g), null);
  });

  it('finds a quote in a shared document, with its page', () => {
    assert.deepEqual(findQuote('Campus Marketplace rebuild', grounds('hi')), {
      source: 'resume',
      sourceId: SOURCE_ID,
      page: 2,
      quote: 'Campus Marketplace rebuild',
    });
  });
});

describe('upsert_claim', () => {
  it('adds a draft line backed by the quote', () => {
    const r = runTool('upsert_claim', upsert(), emptySpec(), grounds('I built it and 300 students use it'));
    assert.match(r.output, /^Added clm_/);
    assert.equal(r.spec.claims.length, 1);
    assert.equal(r.spec.claims[0]!.status, 'draft');
    assert.equal(r.spec.rev, 1);
  });

  it('refuses a quote the person never said', () => {
    const r = runTool('upsert_claim', upsert({ quote: '3000 students use it' }), emptySpec(), grounds('300 students use it'));
    assert.match(r.output, /^Not done: the quote is not/);
    assert.equal(r.spec.claims.length, 0);
  });

  it('refuses arguments that are not JSON or break the schema', () => {
    assert.match(runTool('upsert_claim', '{nope', emptySpec(), grounds('x')).output, /not valid JSON/);
    assert.match(runTool('upsert_claim', upsert({ layer: 'hobby' }), emptySpec(), grounds('300 students use it')).output, /invalid arguments/);
  });

  it('does not add the same line twice', () => {
    const r = runTool('upsert_claim', upsert(), withClaims(claim()), grounds('300 students use it'));
    assert.match(r.output, /already on the portrait as clm_aaaaaaaaaa/);
  });

  it('keeps a rejected line out unless the person asks again in a later message', () => {
    const spec = withClaims(claim({ status: 'rejected', updatedAt: at(5) }));
    // The quote is from message 1 (minute 0), sent before the rejection (minute 5).
    assert.match(runTool('upsert_claim', upsert(), spec, grounds('300 students use it')).output, /rejected this line/);
    // Message 2 (minute 10) came after it: the line comes back as a draft.
    const back = runTool('upsert_claim', upsert(), spec, grounds('hello', 'put it back: 300 students use it'));
    assert.match(back.output, /^Updated clm_aaaaaaaaaa/);
    assert.equal(back.spec.claims[0]!.status, 'draft');
  });

  it('asks before changing a pinned line', () => {
    const r = runTool('upsert_claim', upsert({ id: 'clm_aaaaaaaaaa' }), withClaims(claim({ pinned: true })), grounds('300 students use it'));
    assert.match(r.output, /wrote this line themselves/);
  });

  it('sends a changed confirmed line back to draft', () => {
    const r = runTool(
      'upsert_claim',
      upsert({ id: 'clm_aaaaaaaaaa', statement: 'Built and runs Campus Marketplace for 300 students.' }),
      withClaims(claim({ status: 'confirmed' })),
      grounds('300 students use it'),
    );
    assert.equal(r.spec.claims[0]!.status, 'draft');
  });
});

describe('remove_claim and set_headline', () => {
  it('removes only drafts, and the headline that rested on them', () => {
    const spec = { ...withClaims(claim()), headline: { text: 'Builds for campus', claims: ['clm_aaaaaaaaaa'], status: 'draft' as const } };
    const r = runTool('remove_claim', JSON.stringify({ id: 'clm_aaaaaaaaaa' }), spec, grounds('x'));
    assert.equal(r.spec.claims.length, 0);
    assert.equal(r.spec.headline, null);
    const kept = runTool('remove_claim', JSON.stringify({ id: 'clm_aaaaaaaaaa' }), withClaims(claim({ status: 'confirmed' })), grounds('x'));
    assert.match(kept.output, /only draft lines/);
  });

  it('needs the headline’s lines to be on the portrait', () => {
    const r = runTool('set_headline', JSON.stringify({ text: 'Builds for campus', claim_ids: ['clm_missing000'] }), withClaims(claim()), grounds('x'));
    assert.match(r.output, /aren’t on the portrait/);
  });
});
