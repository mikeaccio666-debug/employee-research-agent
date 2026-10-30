import { createHash, randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

// A stand-in for GitHub, for tests: the OAuth app sign-in (client secret in the form, PKCE) at
// /login/oauth, and the few REST API calls the adapter makes under /api. One person, "dana", owns
// two public repositories and contributed to a third; a fourth is someone else's.

export type FakeGithub = {
  url: string;
  consent(authorizationUrl: URL): { code: string; state: string };
  /** GitHub stops accepting every token. */
  revokeAll(): void;
  /** Tokens deleted through the OAuth app's revoke call. */
  revoked: string[];
  /** API paths called, for checking what was read. */
  calls: string[];
  close(): Promise<void>;
};

export const GITHUB_CLIENT = { id: 'gh-client', secret: 'gh-secret' };

const repo = (owner: string, name: string, description: string, language: string) => ({
  full_name: `${owner}/${name}`,
  name,
  description,
  language,
  topics: [],
  stargazers_count: 12,
  forks_count: 2,
  fork: false,
  created_at: '2024-09-01T00:00:00Z',
  pushed_at: '2025-04-10T00:00:00Z',
  html_url: `https://github.com/${owner}/${name}`,
  homepage: null,
  owner: { login: owner },
});

const REPOS = {
  'dana/bus-buddy': repo('dana', 'bus-buddy', 'Live campus bus arrival times', 'TypeScript'),
  'dana/dotfiles': repo('dana', 'dotfiles', 'My shell setup', 'Shell'),
  'campus/club-site': repo('campus', 'club-site', 'The robotics club site', 'Astro'),
  'stranger/famous-lib': repo('stranger', 'famous-lib', 'A popular library', 'Rust'),
};
const README: Record<string, string> = {
  'dana/bus-buddy': '# Bus Buddy\nShows when the next campus bus arrives. About 300 students used it each day in spring 2025.',
};
const CONTRIBUTORS: Record<string, string[]> = { 'campus/club-site': ['campus-admin', 'dana'], 'stranger/famous-lib': ['stranger'] };

export async function fakeGithub(): Promise<FakeGithub> {
  const codes = new Map<string, { challenge: string; redirect: string }>();
  const tokens = new Set<string>();
  const revoked: string[] = [];
  const calls: string[] = [];
  let base = '';

  const json = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  const body = async (req: IncomingMessage) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    return Buffer.concat(chunks).toString('utf8');
  };

  const http: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', base);
    if (url.pathname === '/login/oauth/access_token' && req.method === 'POST') {
      const form = new URLSearchParams(await body(req));
      const code = codes.get(form.get('code') ?? '');
      codes.delete(form.get('code') ?? '');
      const ok =
        code &&
        form.get('client_id') === GITHUB_CLIENT.id &&
        form.get('client_secret') === GITHUB_CLIENT.secret &&
        form.get('redirect_uri') === code.redirect &&
        createHash('sha256').update(form.get('code_verifier') ?? '').digest('base64url') === code.challenge;
      if (!ok) return json(res, 200, { error: 'bad_verification_code' });
      const t = `gho_${randomUUID()}`;
      tokens.add(t);
      return json(res, 200, { access_token: t, token_type: 'bearer', scope: '' });
    }
    if (url.pathname === `/api/applications/${GITHUB_CLIENT.id}/token` && req.method === 'DELETE') {
      const basic = Buffer.from(`${GITHUB_CLIENT.id}:${GITHUB_CLIENT.secret}`).toString('base64');
      if (req.headers.authorization !== `Basic ${basic}`) return json(res, 401, {});
      const { access_token } = JSON.parse(await body(req)) as { access_token: string };
      if (tokens.delete(access_token)) revoked.push(access_token);
      res.writeHead(204).end();
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
      if (!token || !tokens.has(token)) return json(res, 401, { message: 'Bad credentials' });
      const path = url.pathname.slice(4);
      calls.push(path);
      if (path === '/user') return json(res, 200, { login: 'dana' });
      if (path === '/user/repos') return json(res, 200, Object.values(REPOS).filter((r) => r.owner.login === 'dana' || CONTRIBUTORS[r.full_name]?.includes('dana')));
      const m = /^\/repos\/([^/]+\/[^/]+)(\/[a-z]+)?$/.exec(path);
      const r = m ? REPOS[m[1] as keyof typeof REPOS] : undefined;
      if (!m || !r) return json(res, 404, { message: 'Not Found' });
      if (!m[2]) return json(res, 200, r);
      if (m[2] === '/languages') return json(res, 200, { [r.language]: 9000, CSS: 1000 });
      if (m[2] === '/contributors') return json(res, 200, (CONTRIBUTORS[r.full_name] ?? [r.owner.login]).map((login) => ({ login, contributions: 3 })));
      if (m[2] === '/readme') {
        const text = README[r.full_name];
        if (!text) return json(res, 404, { message: 'Not Found' });
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end(text);
        return;
      }
    }
    res.writeHead(404).end();
  });

  await new Promise<void>((done) => http.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;

  return {
    url: base,
    revoked,
    calls,
    consent(authorizationUrl) {
      const q = authorizationUrl.searchParams;
      if (authorizationUrl.pathname !== '/login/oauth/authorize' || q.get('client_id') !== GITHUB_CLIENT.id) throw new Error('not our OAuth app');
      if (q.get('code_challenge_method') !== 'S256' || !q.get('code_challenge')) throw new Error('no PKCE');
      if (q.get('scope')) throw new Error('asked for scopes');
      const code = randomUUID();
      codes.set(code, { challenge: q.get('code_challenge')!, redirect: q.get('redirect_uri') ?? '' });
      return { code, state: q.get('state') ?? '' };
    },
    revokeAll: () => tokens.clear(),
    close: () => new Promise((done) => http.close(() => done())),
  };
}
