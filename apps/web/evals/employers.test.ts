import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { freeSlug, slugBase } from '@/lib/employers/slug';
import { planBoardSync, syncBoard, toRow, type Board, type EmployerStore, type JobRow } from '@/lib/employers/sync';
import { HubError, hubApi, type HubJob } from '@/lib/jobs/thd-api';

// The employer layer's sync (lib/employers/sync.ts) against a stand-in for talent-data-hub's read
// API that behaves as its code does: pages of at most 200 with `next_cursor`, repeats across pages,
// removed jobs unlisted and 410 by id. Records are made up, in the shape of the contract's own
// example (packages/contracts/examples/v1/job-record.json).

const board: Board = { system: 'greenhouse', tenant: 'acmeanalytics' };
const KEY = 'thd_test_key';

let seq = 0;
const uuid = () => `6f1c2b6e-8d3a-4b1e-9c4f-${String(++seq).padStart(12, '0')}`;

function record(over: Partial<HubJob> & { title: string }): HubJob & Record<string, unknown> {
  const id = over.id ?? uuid();
  return {
    id,
    revision: 1,
    revised_at: '2026-11-04T15:20:11Z',
    status: 'open',
    source: {
      system: board.system,
      tenant: board.tenant,
      external_id: id.slice(-6),
      posting_url: `https://job-boards.greenhouse.io/acmeanalytics/jobs/${id.slice(-6)}`,
      apply_url: null,
    },
    company: { name: 'Acme Analytics, Inc.', domain: null, name_source: 'source' },
    locations: [{ as_published: 'New York, NY', country: 'US', region: null, city: null }],
    workplace_type: 'hybrid',
    employment_type: { as_published: 'Full-time', normalized: 'full_time' },
    posted_at: '2026-10-28T13:00:00Z',
    salary: [{ as_published: '$85,000 - $105,000 USD per year', min: 85000, max: 105000, currency: 'USD', period: 'year', source: 'structured' }],
    description: { sha256: 'a'.repeat(64), language: 'en', html: '<p>We turn product data into decisions.</p>' },
    first_seen_at: '2026-10-28T14:02:37Z',
    last_verified_at: '2026-11-05T09:15:02Z',
    closed_at: null,
    content_sha256: 'b'.repeat(64),
    evidence: { snapshot_sha256: 'c'.repeat(64), parser_version: 'greenhouse@1.0.0', canonicalizer_version: '1.0.0' },
    ...over,
  };
}

/** talent-data-hub, small: what it lists, what it removed, and how it may fail. */
function fakeHub(state: { jobs: unknown[]; removed?: Set<string>; pageSize?: number; failOnPage?: number; repeat?: unknown[] }) {
  const calls: { url: URL; auth: string | null }[] = [];
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const send = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const auth = new Headers(init?.headers).get('authorization');
    calls.push({ url, auth });
    if (auth !== `Bearer ${KEY}`) return json(401, { error: { code: 'unauthorized', message: 'send a valid API key' } });
    const one = /^\/v1\/jobs\/([^/]+)$/.exec(url.pathname);
    if (one) {
      const id = decodeURIComponent(one[1]!);
      if (state.removed?.has(id)) return json(410, { error: { code: 'removed', message: 'removed' } });
      const job = state.jobs.find((j) => (j as { id: string }).id === id);
      return job ? json(200, job) : json(404, { error: { code: 'not_found', message: 'no such job' } });
    }
    if (url.pathname !== '/v1/jobs') return json(404, { error: { code: 'not_found', message: 'no such endpoint' } });
    const size = Math.min(Number(url.searchParams.get('limit') ?? 100), state.pageSize ?? 200);
    const mine = state.jobs.filter((j) => {
      const s = (j as { source?: { system: string; tenant: string } }).source;
      return !s || (s.system === url.searchParams.get('source') && s.tenant === url.searchParams.get('tenant'));
    });
    const from = Number(url.searchParams.get('cursor') ?? 0);
    const pageNo = from / size;
    if (state.failOnPage === pageNo) return json(429, { error: { code: 'rate_limited', message: 'slow down' } });
    const last = from + size >= mine.length;
    const data = [...mine.slice(from, from + size), ...(last ? (state.repeat ?? []) : [])];
    return json(200, { data, next_cursor: last ? null : String(from + size) });
  }) as typeof fetch;
  return { api: hubApi('https://thd.test', KEY, { fetch: send }), calls, send };
}

/** The three tables, in memory. */
function memoryStore() {
  const employers = new Map<string, { id: string; name: string }>();
  const boards = new Map<string, { employerId: string; kind: 'single' | 'multi_brand' | 'staffing'; checkedAt: string | null }>();
  const jobs = new Map<string, JobRow>();
  const key = (b: Board) => `${b.system}/${b.tenant}`;
  const store: EmployerStore = {
    async ensureBoard(b, companyName) {
      let row = boards.get(key(b));
      if (!row) {
        const id = `emp_${employers.size + 1}`;
        employers.set(id, { id, name: companyName });
        row = { employerId: id, kind: 'single', checkedAt: null };
        boards.set(key(b), row);
      }
      return { employerId: row.employerId, kind: row.kind };
    },
    async jobsOnBoard(b) {
      return [...jobs.values()]
        .filter((j) => j.source_system === b.system && j.tenant === b.tenant)
        .map((j) => ({ id: j.id, revision: j.revision, lastVerifiedAt: j.last_verified_at }));
    },
    async saveJobs(rows) {
      for (const r of rows) jobs.set(r.id, r);
    },
    async removeJobs(ids) {
      for (const id of ids) jobs.delete(id);
    },
    async boardChecked(b, at) {
      const row = boards.get(key(b));
      if (row) row.checkedAt = at;
    },
  };
  return { store, employers, boards, jobs, key };
}

describe('talent-data-hub read API client', () => {
  it('reads a board to the last page with the key, and keeps the newest copy of a repeated job', async () => {
    const a = record({ title: 'Data Analyst' });
    const b = record({ title: 'Analytics Engineer', status: 'closed', closed_at: '2026-11-01T00:00:00Z' });
    const c = record({ title: 'Product Analyst' });
    const hub = fakeHub({ jobs: [a, b, c], pageSize: 2, repeat: [{ ...a, revision: 2, title: 'Senior Data Analyst' }] });
    const listing = await hub.api.listBoard(board.system, board.tenant);
    assert.equal(hub.calls.length, 2);
    assert.ok(hub.calls.every((c) => c.auth === `Bearer ${KEY}`));
    assert.equal(hub.calls[0]!.url.searchParams.get('source'), 'greenhouse');
    assert.equal(hub.calls[0]!.url.searchParams.get('tenant'), 'acmeanalytics');
    assert.equal(hub.calls[0]!.url.searchParams.get('limit'), '200');
    assert.equal(hub.calls[0]!.url.searchParams.get('status'), null, 'closed postings are history a dossier reads');
    assert.equal(hub.calls[1]!.url.searchParams.get('cursor'), '2');
    assert.equal(listing.jobs.length, 3);
    assert.equal(listing.jobs.find((j) => j.id === a.id)!.title, 'Senior Data Analyst');
    assert.deepEqual(listing.unread, []);
  });

  it('throws instead of returning part of a board', async () => {
    const hub = fakeHub({ jobs: [record({ title: 'A' }), record({ title: 'B' }), record({ title: 'C' })], pageSize: 2, failOnPage: 1 });
    await assert.rejects(hub.api.listBoard(board.system, board.tenant), (e) => e instanceof HubError && e.status === 429);
    const long = fakeHub({ jobs: Array.from({ length: 7 }, (_, i) => record({ title: `Job ${i}` })), pageSize: 2 });
    const impatient = hubApi('https://thd.test', KEY, { fetch: long.send, maxPages: 2 });
    await assert.rejects(impatient.listBoard(board.system, board.tenant), HubError);
  });

  it('tells a removed job from one it never knew', async () => {
    const a = record({ title: 'Data Analyst' });
    const gone = uuid();
    const hub = fakeHub({ jobs: [a], removed: new Set([gone]) });
    assert.equal((await hub.api.getJob(a.id)).state, 'found');
    assert.deepEqual(await hub.api.getJob(gone), { state: 'removed' });
    assert.deepEqual(await hub.api.getJob(uuid()), { state: 'unknown' });
  });
});

describe('board sync', () => {
  it('on first sight makes the employer and the board, and keeps open and closed postings without the description body', async () => {
    const open = record({ title: 'Data Analyst' });
    const closed = record({ title: 'Analytics Engineer', status: 'closed', closed_at: '2026-11-01T00:00:00Z' });
    const hub = fakeHub({ jobs: [open, closed, record({ title: 'Elsewhere', source: { system: 'lever', tenant: 'other', external_id: '1', posting_url: 'https://jobs.lever.co/other/1', apply_url: null } })] });
    const db = memoryStore();
    const result = await syncBoard(db.store, hub.api, board, { now: new Date('2026-11-13T12:00:00Z') });
    assert.deepEqual(result, { saved: 2, removed: 0, complete: true });
    assert.equal(db.employers.size, 1);
    assert.equal([...db.employers.values()][0]!.name, 'Acme Analytics, Inc.');
    assert.equal(db.boards.get(db.key(board))!.checkedAt, '2026-11-13T12:00:00.000Z');
    const row = db.jobs.get(open.id)!;
    assert.equal(row.employer_id, 'emp_1');
    assert.equal(row.status, 'open');
    assert.equal(row.last_verified_at, '2026-11-05T09:15:02Z');
    assert.equal((row.record.description as { html?: string; sha256: string }).html, undefined);
    assert.equal((row.record.description as { sha256: string }).sha256, 'a'.repeat(64));
    assert.equal((row.record.source as { posting_url: string }).posting_url, open.source.posting_url, 'every stored fact keeps its source link');
    assert.equal(db.jobs.get(closed.id)!.status, 'closed');
    assert.equal(db.jobs.get(closed.id)!.closed_at, '2026-11-01T00:00:00Z');
  });

  it('deletes a posting talent-data-hub removed, and keeps one that only closed', async () => {
    const stays = record({ title: 'Data Analyst' });
    const closes = record({ title: 'Analytics Engineer' });
    const removed = record({ title: 'Product Analyst' });
    const forgotten = record({ title: 'BI Developer' });
    const db = memoryStore();
    await syncBoard(db.store, fakeHub({ jobs: [stays, closes, removed, forgotten] }).api, board);
    assert.equal(db.jobs.size, 4);

    const later = fakeHub({
      jobs: [stays, { ...closes, revision: 2, status: 'closed', closed_at: '2026-11-12T08:00:00Z' }],
      removed: new Set([removed.id]),
    });
    const result = await syncBoard(db.store, later.api, board);
    assert.deepEqual(result, { saved: 1, removed: 2, complete: true });
    assert.equal(db.jobs.has(removed.id), false, '410 means delete');
    assert.equal(db.jobs.has(forgotten.id), false, 'an id talent-data-hub no longer knows cannot be shown with a source');
    assert.equal(db.jobs.get(closes.id)!.status, 'closed');
    assert.equal(db.jobs.get(closes.id)!.revision, 2);
    assert.equal(db.jobs.has(stays.id), true);
  });

  it('changes nothing when the board could not be read to the end', async () => {
    const jobs = [record({ title: 'A' }), record({ title: 'B' }), record({ title: 'C' })];
    const db = memoryStore();
    await syncBoard(db.store, fakeHub({ jobs }).api, board, { now: new Date('2026-11-12T00:00:00Z') });
    const before = JSON.stringify([...db.jobs.values()]);
    // The second page fails: the first page alone would make C look gone.
    const broken = fakeHub({ jobs: jobs.slice(0, 2), pageSize: 1, failOnPage: 1, removed: new Set([jobs[2]!.id]) });
    await assert.rejects(syncBoard(db.store, broken.api, board, { now: new Date('2026-11-13T00:00:00Z') }), HubError);
    assert.equal(JSON.stringify([...db.jobs.values()]), before);
    assert.equal(db.boards.get(db.key(board))!.checkedAt, '2026-11-12T00:00:00.000Z');
  });

  it('keeps a posting that is still there when the listing missed it', async () => {
    const a = record({ title: 'Data Analyst' });
    const b = record({ title: 'Analytics Engineer' });
    const db = memoryStore();
    await syncBoard(db.store, fakeHub({ jobs: [a, b] }).api, board);
    // The listing shows only `a`, but asking for `b` by id still finds it.
    const hub = fakeHub({ jobs: [a, b] });
    const listing = { jobs: [a], unread: [] };
    const result = await syncBoard(db.store, { listBoard: async () => listing, getJob: hub.api.getJob }, board);
    assert.equal(result.removed, 0);
    assert.equal(db.jobs.has(b.id), true);
  });

  it('never replaces a posting with an older revision, and saves a newer verification', () => {
    const a = record({ title: 'Data Analyst', revision: 3 });
    const stored = [{ id: a.id, revision: 3, lastVerifiedAt: a.last_verified_at }];
    assert.deepEqual(planBoardSync(stored, { jobs: [{ ...a, revision: 2 }], unread: [] }), { save: [], missing: [] });
    assert.deepEqual(planBoardSync(stored, { jobs: [a], unread: [] }), { save: [], missing: [] });
    const verified = { ...a, last_verified_at: '2026-11-06T09:15:02Z' };
    assert.deepEqual(planBoardSync(stored, { jobs: [verified], unread: [] }).save, [verified]);
  });

  it('leaves a held posting alone when its listed record could not be read', async () => {
    const a = record({ title: 'Data Analyst' });
    const db = memoryStore();
    await syncBoard(db.store, fakeHub({ jobs: [a] }).api, board);
    const unreadable = fakeHub({ jobs: [{ id: a.id, source: a.source, title: '' }] });
    const result = await syncBoard(db.store, unreadable.api, board);
    assert.deepEqual(result, { saved: 0, removed: 0, complete: true });
    assert.equal(db.jobs.get(a.id)!.title, 'Data Analyst');
  });

  it('does not count a staffing or multi-brand board as one employer', async () => {
    const a = record({ title: 'Warehouse Associate' });
    const db = memoryStore();
    await db.store.ensureBoard(board, 'Acme Staffing');
    db.boards.get(db.key(board))!.kind = 'staffing';
    await syncBoard(db.store, fakeHub({ jobs: [a] }).api, board);
    assert.equal(db.jobs.get(a.id)!.employer_id, null);
  });

  it('asks about a bounded number of missing postings per run and says when it stopped short', async () => {
    const jobs = Array.from({ length: 5 }, (_, i) => record({ title: `Job ${i}` }));
    const db = memoryStore();
    await syncBoard(db.store, fakeHub({ jobs }).api, board, { now: new Date('2026-11-12T00:00:00Z') });
    const hub = fakeHub({ jobs: [], removed: new Set(jobs.map((j) => j.id)) });
    const first = await syncBoard(db.store, hub.api, board, { maxLookups: 3, now: new Date('2026-11-13T00:00:00Z') });
    assert.deepEqual(first, { saved: 0, removed: 3, complete: false });
    assert.equal(db.boards.get(db.key(board))!.checkedAt, '2026-11-12T00:00:00.000Z', 'not marked checked until every missing posting was asked about');
    const second = await syncBoard(db.store, hub.api, board, { maxLookups: 3, now: new Date('2026-11-13T01:00:00Z') });
    assert.deepEqual(second, { saved: 0, removed: 2, complete: true });
    assert.equal(db.jobs.size, 0);
  });

  it('cuts a very long location list so the row stays small', () => {
    const many = record({ title: 'Field Technician', locations: Array.from({ length: 450 }, (_, i) => ({ as_published: `Site ${i}`, country: 'US', region: null, city: null })) });
    assert.equal((toRow(many, null).record.locations as unknown[]).length, 200);
  });
});

describe('company page addresses', () => {
  it('reads a name into a slug the table accepts', () => {
    const ok = /^[a-z0-9][a-z0-9-]{0,79}$/;
    const cases: [string, string, string][] = [
      ['Acme Analytics, Inc.', 'acmeanalytics', 'acme-analytics'],
      ['AT&T', 'att', 'at-and-t'],
      ['Société Générale S.A.', 'socgen', 'societe-generale'],
      ["Moody's Corporation", 'moodys', 'moodys'],
      ['The Trade Desk', 'thetradedesk', 'the-trade-desk'],
      ['Company', 'co', 'company'],
      ['字节跳动', 'bytedance', 'bytedance'],
      ['—', '', 'company'],
      ['x'.repeat(200), 'x', 'x'.repeat(60)],
    ];
    for (const [name, tenant, want] of cases) {
      const got = slugBase(name, tenant);
      assert.equal(got, want, name);
      assert.match(got, ok);
    }
  });

  it('numbers a second company with the same name', async () => {
    const taken = new Set(['acme', 'acme-2']);
    assert.equal(await freeSlug('acme', (s) => taken.has(s)), 'acme-3');
    assert.equal(await freeSlug('globex', (s) => taken.has(s)), 'globex');
  });
});
