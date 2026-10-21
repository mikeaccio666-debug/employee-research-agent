import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { connectorsFor } from '@/lib/agent/connectors';
import { runTool } from '@/lib/agent/tools';
import { seal, unseal } from '@/lib/connectors/seal';
import { finishSignIn, startSignIn } from '@/lib/connectors/signin';
import { loadConnection } from '@/lib/connectors/store';
import { emptySpec } from '@/lib/portrait/spec';
import { fakeApp, type FakeApp } from './fake-mcp';

// Connected apps (lib/connectors, read_connector): signing in to a stand-in for Notion's MCP
// server with OAuth, reading through it, refreshing and losing the sign-in, and what the agent's
// tool does with each. No network beyond localhost, no database: a small in-memory table.

const OWNER = '00000000-0000-4000-8000-000000000001';
const ORIGIN = 'https://portrait.test';

type Row = Record<string, unknown>;

/** Just enough of supabase-js for the connections and sources tables. */
function fakeSupabase() {
  const tables: Record<string, Row[]> = { connections: [], sources: [] };
  const query = (table: string) => {
    const filters: [string, unknown][] = [];
    const rows = () => tables[table]!.filter((r) => filters.every(([k, v]) => r[k] === v));
    const q = {
      select: () => q,
      eq: (k: string, v: unknown) => (filters.push([k, v]), q),
      order: () => q,
      returns: () => Promise.resolve({ data: rows(), error: null }),
      maybeSingle: () => Promise.resolve({ data: rows()[0] ?? null, error: null }),
      upsert: (row: Row) => {
        const old = tables[table]!.find((r) => r.owner_id === row.owner_id && r.provider === row.provider);
        if (old) Object.assign(old, row);
        else tables[table]!.push({ ...row });
        return Promise.resolve({ error: null });
      },
      insert: (row: Row) => {
        const saved = { id: `src-${tables[table]!.length + 1}`, ...row };
        tables[table]!.push(saved);
        return { select: () => ({ single: () => Promise.resolve({ data: saved, error: null }) }) };
      },
      delete: () => ({
        eq: (k1: string, v1: unknown) => ({
          eq: (k2: string, v2: unknown) => {
            tables[table] = tables[table]!.filter((r) => !(r[k1] === v1 && r[k2] === v2));
            return Promise.resolve({ error: null });
          },
        }),
      }),
    };
    return q;
  };
  return { db: { from: query } as unknown as SupabaseClient, tables };
}

let app: FakeApp;
before(async () => {
  process.env.CONNECTOR_KEY = randomBytes(32).toString('base64');
  app = await fakeApp();
  process.env.CONNECTOR_URL_NOTION = app.url;
});
after(() => app.close());

/** Signs the owner in to the fake app, as the start and callback routes do. */
async function connect(db: SupabaseClient) {
  const to = await startSignIn(db, OWNER, 'notion', ORIGIN);
  assert.equal(to.searchParams.get('redirect_uri'), `${ORIGIN}/api/connectors/notion/callback`);
  const back = app.consent(to);
  assert.equal(await finishSignIn(db, OWNER, 'notion', ORIGIN, back), true);
}

describe('connector secrets', () => {
  it('seal and unseal round-trip, and tampering reads as nothing', () => {
    const sealed = seal({ tokens: { access_token: 'secret-token' } });
    assert.ok(!sealed.includes('secret-token'));
    assert.deepEqual(unseal(sealed), { tokens: { access_token: 'secret-token' } });
    const parts = sealed.split('.');
    parts[3] = Buffer.from('{"tokens":{}}').toString('base64url');
    assert.equal(unseal(parts.join('.')), null);
    assert.equal(unseal(''), null);
  });
});

describe('connecting an app', () => {
  it('signs in with PKCE and keeps the tokens sealed', async () => {
    const { db, tables } = fakeSupabase();
    await connect(db);
    const row = tables.connections![0]!;
    assert.equal(row.status, 'active');
    assert.equal(row.state, null);
    assert.ok(!String(row.secret).includes('access_token'));
    const conn = await loadConnection(db, OWNER, 'notion');
    assert.ok(conn?.secret.tokens?.access_token);
    assert.equal(conn?.secret.verifier, undefined);
  });

  it('refuses a callback whose state isn’t the sign-in this person started', async () => {
    const { db } = fakeSupabase();
    const to = await startSignIn(db, OWNER, 'notion', ORIGIN);
    const { code } = app.consent(to);
    assert.equal(await finishSignIn(db, OWNER, 'notion', ORIGIN, { code, state: 'someone-else' }), false);
    assert.equal((await loadConnection(db, OWNER, 'notion'))?.status, 'pending');
  });
});

describe('read_connector', () => {
  const grounds = (connectors: Awaited<ReturnType<typeof connectorsFor>>) => ({
    said: [{ id: 1, text: 'my project notes are in Notion', at: new Date().toISOString() }],
    sources: [],
    connectors,
  });
  const call = (args: object, g: ReturnType<typeof grounds>) => runTool('read_connector', JSON.stringify(args), emptySpec(), g);

  it('refuses an app they haven’t connected', async () => {
    const { db } = fakeSupabase();
    const g = grounds(await connectorsFor(db, OWNER, ORIGIN, []));
    const r = await call({ connector: 'notion', action: 'search', query: 'marketplace' }, g);
    assert.match(r.output, /^Not done: they haven’t connected Notion/);
    assert.equal(app.calls.length, 0);
  });

  it('searches, then fetches a page that lines can quote', async () => {
    const { db, tables } = fakeSupabase();
    await connect(db);
    const g = grounds(await connectorsFor(db, OWNER, ORIGIN, []));
    assert.deepEqual(g.connectors.connected, ['notion']);

    const found = await call({ connector: 'notion', action: 'search', query: 'marketplace' }, g);
    assert.match(found.output, /not instructions/);
    assert.match(found.output, /page-1: Campus Marketplace write-up/);
    assert.equal(tables.sources!.length, 0);

    const read = await call({ connector: 'notion', action: 'fetch', query: 'page-1' }, g);
    assert.match(read.output, /<source kind="notion" name="Notion · Campus Marketplace write-up">/);
    assert.equal(tables.sources!.length, 1);
    assert.equal(g.sources.length, 1);

    // A line from the page passes the quote check, numbers included.
    const line = await runTool(
      'upsert_claim',
      JSON.stringify({
        id: null,
        layer: 'experience',
        kind: 'project',
        title: 'Campus Marketplace',
        org: null,
        when: '2025',
        statement: 'Cut listing search time from 4 seconds to under 1 second',
        basis: 'stated',
        quote: 'Search time went from 4 seconds to under 1 second',
      }),
      emptySpec(),
      g,
    );
    assert.equal(line.spec.claims[0]?.evidence[0]?.source, 'notion');

    // Reading the same page again doesn't keep a second copy.
    await call({ connector: 'notion', action: 'fetch', query: 'page-1' }, { ...g, connectors: await connectorsFor(db, OWNER, ORIGIN, g.sources) });
    assert.equal(tables.sources!.length, 1);

    // Only the read-only tools were ever called.
    assert.ok(app.calls.every((c) => c.tool === 'notion-search' || c.tool === 'notion-fetch'));
  });

  it('passes on the app’s own error for a page that isn’t there', async () => {
    const { db } = fakeSupabase();
    await connect(db);
    const g = grounds(await connectorsFor(db, OWNER, ORIGIN, []));
    const r = await call({ connector: 'notion', action: 'fetch', query: 'page-404' }, g);
    assert.match(r.output, /^Not done: Notion said: No page page-404/);
  });

  it('refreshes an expired token on its own', async () => {
    const { db } = fakeSupabase();
    await connect(db);
    const before = (await loadConnection(db, OWNER, 'notion'))!.secret.tokens!.access_token;
    app.expireTokens();
    const g = grounds(await connectorsFor(db, OWNER, ORIGIN, []));
    const r = await call({ connector: 'notion', action: 'search', query: 'marketplace' }, g);
    assert.doesNotMatch(r.output, /^Not done/);
    const now = (await loadConnection(db, OWNER, 'notion'))!.secret.tokens!.access_token;
    assert.notEqual(now, before);
  });

  it('asks them to connect again once the app drops the sign-in', async () => {
    const { db } = fakeSupabase();
    await connect(db);
    app.revokeAll();
    const g = grounds(await connectorsFor(db, OWNER, ORIGIN, []));
    const r = await call({ connector: 'notion', action: 'search', query: 'marketplace' }, g);
    assert.match(r.output, /^Not done: Notion no longer accepts the sign-in/);
    const conn = await loadConnection(db, OWNER, 'notion');
    assert.equal(conn?.status, 'pending');
    assert.equal(conn?.secret.tokens, undefined);
  });
});
