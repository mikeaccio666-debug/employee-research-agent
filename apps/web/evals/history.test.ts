import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { describeChange, entries, restoreVersion, revertChange } from '@/lib/portrait/history';
import { emptySpec, type Claim, type Spec } from '@/lib/portrait/spec';

// The portrait's version history (lib/portrait/history.ts): undoing one change keeps the rest.
// Run with `pnpm --filter @portrait/web test`.

const line = (id: string, statement: string, over: Partial<Claim> = {}): Claim => ({
  id,
  layer: 'experience',
  kind: 'project',
  statement,
  title: null,
  org: null,
  when: null,
  basis: 'stated',
  status: 'draft',
  pinned: false,
  evidence: [],
  createdBy: 'agent',
  updatedAt: '2026-10-21T10:00:00.000Z',
  ...over,
});

const spec = (rev: number, claims: Claim[], over: Partial<Spec> = {}): Spec => ({ ...emptySpec(), rev, claims, ...over });

const A = line('clm_aaaaaa', 'Built Campus Marketplace.');
const B = line('clm_bbbbbb', 'Led the move to Postgres.');
const C = line('clm_cccccc', 'Ran the robotics club.');

describe('version history', () => {
  it('undoes one added line and keeps lines added later', () => {
    const v1 = spec(1, [A]);
    const v2 = spec(2, [A, B]);
    const now = spec(3, [A, B, C]);
    const { spec: out, skipped } = revertChange(v1, v2, now);
    assert.deepEqual(out.claims.map((c) => c.id), [A.id, C.id]);
    assert.equal(out.rev, 4);
    assert.equal(skipped, 0);
  });

  it('puts back a rewording and a removed line', () => {
    const before = spec(1, [A, B]);
    const after = spec(2, [{ ...A, statement: 'Built it.' }]);
    const { spec: out } = revertChange(before, after, after);
    assert.equal(out.claims.find((c) => c.id === A.id)?.statement, A.statement);
    assert.ok(out.claims.some((c) => c.id === B.id));
  });

  it('leaves a line alone when it changed again since', () => {
    const before = spec(1, [A]);
    const after = spec(2, [{ ...A, statement: 'Built it.' }]);
    const now = spec(3, [{ ...A, statement: 'Built it, my words.', pinned: true }]);
    const { spec: out, skipped } = revertChange(before, after, now);
    assert.equal(out.claims[0]!.statement, 'Built it, my words.');
    assert.equal(skipped, 1);
  });

  it('undoing a Right sends the line back to draft', () => {
    const before = spec(1, [A]);
    const after = spec(2, [{ ...A, status: 'confirmed' }]);
    assert.equal(revertChange(before, after, after).spec.claims[0]!.status, 'draft');
  });

  it('drops a headline whose line the undo takes away', () => {
    const before = spec(1, [A]);
    const after = spec(2, [A, B], { headline: { text: 'Builder', claims: [B.id], status: 'draft', alternatives: [] } });
    const out = revertChange(before, after, after).spec;
    assert.equal(out.headline, null);
  });

  it('compares lines whatever order their keys come in', () => {
    const before = spec(1, []);
    const after = spec(2, [A]);
    const reordered = JSON.parse(JSON.stringify(A, Object.keys(A).sort())) as Claim;
    const { skipped, spec: out } = revertChange(before, after, spec(2, [reordered]));
    assert.equal(skipped, 0);
    assert.equal(out.claims.length, 0);
  });

  it('going back to a version keeps notes and preferences', () => {
    const note = { id: 'nte_aaaaaa', text: 'ask about Kafka', at: '2026-10-21T10:00:00.000Z' };
    const now = spec(5, [A, B, C], { notes: [note] });
    const out = restoreVersion(spec(1, [A]), now);
    assert.deepEqual(out.claims.map((c) => c.id), [A.id]);
    assert.deepEqual(out.notes, [note]);
    assert.equal(out.rev, 6);
  });

  it('says what changed, and lists newest first with the oldest not undoable', () => {
    assert.equal(describeChange(spec(1, [A]), spec(2, [A, B, C])), 'Added 2 lines');
    assert.match(describeChange(spec(1, [A]), spec(2, [{ ...A, status: 'confirmed' }])), /^Confirmed “Built/);
    const list = entries([
      { id: 1, rev: 1, madeBy: 'agent', at: '2026-10-21T10:00:00Z', spec: spec(1, [A]) },
      { id: 2, rev: 2, madeBy: 'person', at: '2026-10-21T10:01:00Z', spec: spec(2, [{ ...A, status: 'confirmed' }]) },
    ]);
    assert.deepEqual(list.map((e) => [e.id, e.undoable]), [[2, true], [1, false]]);
  });
});
