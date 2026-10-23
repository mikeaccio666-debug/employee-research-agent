import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { connectorsFor } from '@/lib/agent/connectors';
import { imageType, readImage } from '@/lib/agent/images';
import { plan } from '@/lib/agent/planner';
import { runTool } from '@/lib/agent/tools';
import { canConnect } from '@/lib/connectors/catalog';
import { revokeTokens } from '@/lib/connectors/revoke';
import { seal, unseal } from '@/lib/connectors/seal';
import { finishSignIn, startSignIn } from '@/lib/connectors/signin';
import { loadConnection } from '@/lib/connectors/store';
import type { Source } from '@/lib/agent/sources';
import { emptySpec } from '@/lib/portrait/spec';
import { fakeGithub, GITHUB_CLIENT, type FakeGithub } from './fake-github';
import { fakeApp, PAGE_PICTURE, type FakeApp } from './fake-mcp';

// Connected apps (lib/connectors, read_connector): signing in to a stand-in for Notion's MCP
// server with OAuth, reading through it, refreshing and losing the sign-in, and what the agent's
// tool does with each. No network beyond localhost, no database: a small in-memory table.

const OWNER = '00000000-0000-4000-8000-000000000001';
const ORIGIN = 'https://portrait.test';

type Row = Record<string, unknown>;

/** Just enough of supabase-js for the connections, sources and app_requests tables. */
function fakeSupabase() {
  const tables: Record<string, Row[]> = { connections: [], sources: [], app_requests: [] };
  const query = (table: string) => {
    const filters: [string, unknown][] = [];
    const rows = () => tables[table]!.filter((r) => filters.every(([k, v]) => r[k] === v));
    const q = {
      select: () => q,
      eq: (k: string, v: unknown) => (filters.push([k, v]), q),
      order: () => q,
      returns: () => Promise.resolve({ data: rows(), error: null }),
      maybeSingle: () => Promise.resolve({ data: rows()[0] ?? null, error: null }),
      upsert: (row: Row, opts: { onConflict: string; ignoreDuplicates?: boolean }) => {
        const keys = opts.onConflict.split(',');
        const old = tables[table]!.find((r) => keys.every((k) => r[k] === row[k]));
        if (old && !opts.ignoreDuplicates) Object.assign(old, row);
        else if (!old) tables[table]!.push({ ...row });
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
let gh: FakeGithub;
before(async () => {
  process.env.CONNECTOR_KEY = randomBytes(32).toString('base64');
  app = await fakeApp();
  process.env.CONNECTOR_URL_NOTION = app.url;
  gh = await fakeGithub();
  process.env.CONNECTOR_URL_GITHUB = gh.url;
  process.env.CONNECTOR_CLIENT_ID_GITHUB = GITHUB_CLIENT.id;
  process.env.CONNECTOR_CLIENT_SECRET_GITHUB = GITHUB_CLIENT.secret;
});
after(async () => {
  await app.close();
  await gh.close();
});

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

  it('offers a Connect button for an app they mention but haven’t connected, and only then', async () => {
    const { db } = fakeSupabase();
    const g = grounds(await connectorsFor(db, OWNER, ORIGIN, []));
    assert.deepEqual(g.connectors.available, ['notion', 'github']);
    const offer = await runTool('offer_connect', JSON.stringify({ connector: 'notion' }), emptySpec(), g);
    assert.equal(offer.change?.connect, 'notion');
    await connect(db);
    const again = await runTool('offer_connect', JSON.stringify({ connector: 'notion' }), emptySpec(), grounds(await connectorsFor(db, OWNER, ORIGIN, [])));
    assert.match(again.output, /^Not done: Notion is already connected/);
    assert.equal(again.change, undefined);
  });

  it('lists apps in the plan: connected ones to read, others to offer', () => {
    assert.match(plan(emptySpec(), [], { connected: [], available: ['notion'] }), /Apps they could connect \(offer_connect.*Notion/);
    assert.match(plan(emptySpec(), [], { connected: ['notion'], available: [] }), /Apps they connected \(read_connector.*Notion/);
    assert.doesNotMatch(plan(emptySpec(), []), /Apps they/);
  });

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

describe('the app store’s catalog', () => {
  it('lists an app that needs our registration as coming soon until it is set', () => {
    assert.equal(canConnect('notion'), true);
    assert.equal(canConnect('github'), true);
    const id = process.env.CONNECTOR_CLIENT_ID_GITHUB;
    delete process.env.CONNECTOR_CLIENT_ID_GITHUB;
    assert.equal(canConnect('github'), false);
    process.env.CONNECTOR_CLIENT_ID_GITHUB = id;
    // Not built yet: never connectable, whatever the environment says.
    assert.equal(canConnect('figma'), false);
  });

  it('offer_connect notes an app that isn’t here, by catalog id or the name they used', async () => {
    const { db, tables } = fakeSupabase();
    const g = { said: [], sources: [], connectors: await connectorsFor(db, OWNER, ORIGIN, []) };
    assert.deepEqual(g.connectors.available, ['notion', 'github']);
    for (const name of ['figma', 'Behance', 'Google Docs', 'Behance']) {
      const r = await runTool('offer_connect', JSON.stringify({ connector: name }), emptySpec(), g);
      assert.match(r.output, /can't be connected here yet/);
      assert.equal(r.change, undefined);
    }
    assert.deepEqual(tables.app_requests!.map((r) => r.app).sort(), ['behance', 'figma', 'google-drive']);
    const gh = await runTool('offer_connect', JSON.stringify({ connector: 'GitHub' }), emptySpec(), g);
    assert.equal(gh.change?.connect, 'github');
  });
});

describe('an app read through its API (GitHub)', () => {
  const grounds = async (db: SupabaseClient) => ({ said: [], sources: [] as Source[], connectors: await connectorsFor(db, OWNER, ORIGIN, []) });
  const read = (args: object, g: Awaited<ReturnType<typeof grounds>>) => runTool('read_connector', JSON.stringify({ connector: 'github', ...args }), emptySpec(), g);
  async function connectGithub(db: SupabaseClient) {
    const to = await startSignIn(db, OWNER, 'github', ORIGIN);
    assert.equal(to.origin + to.pathname, `${gh.url}/login/oauth/authorize`);
    assert.equal(await finishSignIn(db, OWNER, 'github', ORIGIN, gh.consent(to)), true);
  }

  it('signs in with our registration and PKCE, asking for no scopes, and keeps only the token', async () => {
    const { db, tables } = fakeSupabase();
    await connectGithub(db);
    assert.ok(!String(tables.connections![0]!.secret).includes('gho_'));
    const conn = await loadConnection(db, OWNER, 'github');
    assert.equal(conn?.status, 'active');
    assert.match(conn?.secret.tokens?.access_token ?? '', /^gho_/);
    assert.equal(conn?.secret.client, undefined);
  });

  it('lists their repositories, and reads one they own or contributed to, never someone else’s', async () => {
    const { db, tables } = fakeSupabase();
    await connectGithub(db);
    const g = await grounds(db);
    const found = await read({ action: 'search', query: 'bus' }, g);
    assert.match(found.output, /dana\/bus-buddy: Live campus bus arrival times/);
    assert.doesNotMatch(found.output, /dotfiles/);

    const own = await read({ action: 'fetch', query: 'https://github.com/dana/bus-buddy' }, g);
    assert.match(own.output, /<source kind="github" name="GitHub · dana\/bus-buddy" url="https:\/\/github.com\/dana\/bus-buddy">/);
    assert.match(own.output, /About 300 students used it each day/);
    assert.equal(tables.sources!.length, 1);

    const club = await read({ action: 'fetch', query: 'campus/club-site' }, g);
    assert.match(club.output, /dana contributed to it/);

    const theirs = await read({ action: 'fetch', query: 'stranger/famous-lib' }, g);
    assert.match(theirs.output, /^Not done: GitHub said: stranger\/famous-lib isn’t theirs/);
    assert.equal(tables.sources!.length, 2);
  });

  it('disconnecting tells GitHub to forget the token', async () => {
    const { db } = fakeSupabase();
    await connectGithub(db);
    const conn = (await loadConnection(db, OWNER, 'github'))!;
    await revokeTokens('github', conn.secret);
    assert.deepEqual(gh.revoked, [conn.secret.tokens!.access_token]);
    // A copy of the token reads nothing now, and the studio offers to connect again.
    const r = await read({ action: 'search', query: 'bus' }, await grounds(db));
    assert.match(r.output, /^Not done: GitHub no longer accepts the sign-in/);
    assert.equal((await loadConnection(db, OWNER, 'github'))?.status, 'pending');
  });
});

describe('disconnecting an MCP app', () => {
  it('revokes the refresh and access tokens where the app offers revocation', async () => {
    const { db } = fakeSupabase();
    await connect(db);
    const conn = (await loadConnection(db, OWNER, 'notion'))!;
    await revokeTokens('notion', conn.secret);
    assert.deepEqual(app.revoked.slice(-2), ['refresh_token', 'access_token']);
  });
});

describe('images', () => {
  const PNG = new Uint8Array(Buffer.from(PAGE_PICTURE, 'base64'));
  const see = async () => 'Text in the image:\nFold · 2nd place, Spring Design Show 2025\n\nWhat it shows:\nA poster with a folding stool.';

  it('reads an image into text once, by its bytes rather than its name', async () => {
    assert.equal(imageType(PNG), 'image/png');
    assert.equal(imageType(new Uint8Array(Buffer.from('%PDF-1.7'))), null);
    const read = await readImage(see, PNG, 'fold.png');
    assert.ok(read.ok);
    assert.equal(read.kind, 'image');
    assert.match(read.pages[0]!.text, /^\[Read from an image by the app/);
    assert.match(read.pages[0]!.text, /2nd place, Spring Design Show 2025/);
    const notImage = await readImage(see, new Uint8Array(Buffer.from('hello there, not a picture')), 'notes.png');
    assert.equal(notImage.ok, false);
    const failing = await readImage(async () => Promise.reject(new Error('down')), PNG, 'fold.png');
    assert.equal(failing.ok, false);
  });

  it('a picture in an app’s page joins the page’s text, and lines can quote it', async () => {
    const { db } = fakeSupabase();
    await connect(db);
    const g = { said: [], sources: [] as Source[], connectors: await connectorsFor(db, OWNER, ORIGIN, [], see) };
    const read = await runTool('read_connector', JSON.stringify({ connector: 'notion', action: 'fetch', query: 'page-2' }), emptySpec(), g);
    assert.match(read.output, /\[Picture 1 in the page\]/);
    const line = await runTool(
      'upsert_claim',
      JSON.stringify({
        id: null,
        layer: 'experience',
        kind: 'project',
        title: 'Fold',
        org: null,
        when: '2025',
        statement: 'Fold won second place at the Spring Design Show',
        basis: 'stated',
        quote: 'Fold · 2nd place, Spring Design Show 2025',
      }),
      emptySpec(),
      g,
    );
    assert.equal(line.spec.claims[0]?.evidence[0]?.source, 'notion');
    // Without a model to read pictures, the page is its text alone.
    const { db: db2 } = fakeSupabase();
    await connect(db2);
    const plain = await runTool('read_connector', JSON.stringify({ connector: 'notion', action: 'fetch', query: 'page-2' }), emptySpec(), {
      said: [],
      sources: [],
      connectors: await connectorsFor(db2, OWNER, ORIGIN, []),
    });
    assert.doesNotMatch(plain.output, /Picture 1/);
  });
});
