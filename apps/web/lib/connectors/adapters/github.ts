import type { Adapter, Reached } from './types';

// GitHub through its REST API, signed in with our OAuth app (CONNECTOR_CLIENT_ID_GITHUB and
// CONNECTOR_CLIENT_SECRET_GITHUB). No scopes are asked for, so the token reads only what anyone
// could see: their public repositories. GitHub has no read-only scope for private ones, and a
// token that could push to them is more than the agent should hold.
// search lists their own repositories that match the words; fetch reads one whole (description,
// languages, README), and only one they own or contributed to, so it is evidence about them.
// CONNECTOR_URL_GITHUB points both the sign-in and the API at a local stand-in for tests.

const base = () => process.env.CONNECTOR_URL_GITHUB;
const web = () => base() ?? 'https://github.com';
const api = () => (base() ? `${base()}/api` : 'https://api.github.com');

const TIMEOUT_MS = 15_000;
const README_CHARS = 30_000;

type Repo = {
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  created_at: string;
  pushed_at: string;
  html_url: string;
  homepage: string | null;
  owner: { login: string };
};

class Status extends Error {
  constructor(readonly status: number) {
    super(`GitHub answered ${status}`);
  }
}

async function get<T>(path: string, token: string, signal?: AbortSignal, raw = false): Promise<T> {
  const res = await fetch(`${api()}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'portrait-studio',
    },
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]) : AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Status(res.status);
  return (raw ? res.text() : res.json()) as Promise<T>;
}

const month = (iso: string) => iso.slice(0, 7);

/** "owner/repo" from what the agent passed: the name, or a github.com link. */
function repoName(input: string): string | null {
  const s = input.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\.git$/, '');
  const m = /^([\w.-]+)\/([\w.-]+)/.exec(s);
  return m ? `${m[1]}/${m[2]}` : null;
}

async function search(query: string, token: string, signal?: AbortSignal): Promise<Reached> {
  const [me, repos] = await Promise.all([
    get<{ login: string }>('/user', token, signal),
    get<Repo[]>('/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator', token, signal),
  ]);
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1 && !['repo', 'repos', 'github', 'my', 'all', 'projects'].includes(w));
  const hay = (r: Repo) => [r.name, r.description, r.language, ...(r.topics ?? [])].join(' ').toLowerCase();
  const matching = words.length ? repos.filter((r) => words.some((w) => hay(r).includes(w))) : repos;
  const shown = (matching.length ? matching : repos).slice(0, 30);
  const lines = shown.map(
    (r) =>
      `${r.full_name}: ${r.description ?? 'no description'} · ${r.language ?? 'no main language'}${r.fork ? ' · a fork' : ''} · ★${r.stargazers_count} · last pushed ${month(r.pushed_at)}`,
  );
  const head = matching.length || !words.length ? `${me.login}'s repositories` : `Nothing matched "${query}"; ${me.login}'s repositories`;
  return { ok: true, text: `${head}:\n${lines.join('\n') || 'none public yet'}` };
}

async function fetchRepo(input: string, token: string, signal?: AbortSignal): Promise<Reached> {
  const name = repoName(input);
  if (!name) return { ok: false, error: 'GitHub said: pass a repository as owner/name' };
  const [me, repo] = await Promise.all([get<{ login: string }>('/user', token, signal), get<Repo>(`/repos/${name}`, token, signal)]);
  const own = repo.owner.login.toLowerCase() === me.login.toLowerCase();
  if (!own) {
    const people = await get<{ login: string; contributions: number }[]>(`/repos/${name}/contributors?per_page=100`, token, signal).catch(() => []);
    if (!people.some((p) => p.login.toLowerCase() === me.login.toLowerCase())) {
      return { ok: false, error: `GitHub said: ${name} isn’t theirs and they haven’t contributed to it` };
    }
  }
  const [languages, readme] = await Promise.all([
    get<Record<string, number>>(`/repos/${name}/languages`, token, signal).catch(() => ({})),
    get<string>(`/repos/${name}/readme`, token, signal, true).catch(() => ''),
  ]);
  const total = Object.values(languages).reduce((a, b) => a + b, 0);
  const langs = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([l, n]) => `${l} ${Math.round((n / total) * 100)}%`);
  const text = [
    `# ${repo.full_name}`,
    repo.description ?? '',
    `${own ? `Owned by ${me.login}` : `${me.login} contributed to it`}${repo.fork ? ', a fork' : ''}. Created ${month(repo.created_at)}, last pushed ${month(repo.pushed_at)}. ★${repo.stargazers_count}, ${repo.forks_count} forks.`,
    langs.length ? `Languages: ${langs.join(', ')}` : '',
    repo.topics?.length ? `Topics: ${repo.topics.join(', ')}` : '',
    repo.homepage ? `Site: ${repo.homepage}` : '',
    `Link: ${repo.html_url}`,
    readme ? `\nREADME:\n${readme.slice(0, README_CHARS)}` : '\nNo README.',
  ]
    .filter(Boolean)
    .join('\n');
  return { ok: true, text, url: repo.html_url };
}

export const github: Adapter = {
  oauth: () => ({
    metadata: {
      issuer: web(),
      authorization_endpoint: `${web()}/login/oauth/authorize`,
      token_endpoint: `${web()}/login/oauth/access_token`,
      response_types_supported: ['code'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_post'],
    },
  }),

  async read(action, input, token, signal) {
    try {
      return action === 'search' ? await search(input, token, signal) : await fetchRepo(input, token, signal);
    } catch (e) {
      if (e instanceof Status && e.status === 401) return { ok: false, reconnect: true, error: 'GitHub no longer accepts the sign-in; they need to connect it again in the studio' };
      if (e instanceof Status && e.status === 404) return { ok: false, error: 'GitHub said: no such repository, or it isn’t public' };
      console.error('github read failed', { action, error: e instanceof Error ? e.message : e });
      return { ok: false, error: 'GitHub didn’t answer' };
    }
  },

  async revoke(token, client) {
    await fetch(`${api()}/applications/${client.client_id}/token`, {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${Buffer.from(`${client.client_id}:${client.client_secret}`).toString('base64')}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'portrait-studio',
      },
      body: JSON.stringify({ access_token: token }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  },
};
