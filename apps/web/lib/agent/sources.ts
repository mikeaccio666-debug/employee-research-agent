import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { SupabaseClient } from '@supabase/supabase-js';

// What the person hands the agent besides their words (docs/agent-design.md §3): a résumé they
// upload, or a link they paste. Each is read to plain text, page by page, kept in `sources`, and
// shown to the model as a <source> block. Lines the agent draws from it must quote it exactly,
// checked in lib/agent/tools.ts. Everything read here is data, never instructions.

export const SOURCE_KINDS = ['resume', 'website', 'github'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];
export type Page = { page: number | null; text: string };
export type Source = { id: string; kind: SourceKind; name: string; url: string | null; pages: Page[] };

export const RESUME_BUCKET = 'sources';
export const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const MAX_PAGES = 10;
// Enough for a long résumé or a full profile page; the rest of a page is cut.
const MAX_CHARS = 40_000;
const MAX_LINKS = 3;

type Read = { ok: true; kind: SourceKind; name: string; url: string | null; pages: Page[] } | { ok: false; error: string };

const tidy = (s: string) =>
  s
    .replace(/\r/g, '')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** Keeps the whole text under MAX_CHARS, cutting from the last pages first. */
function cap(pages: Page[]): Page[] {
  let left = MAX_CHARS;
  return pages
    .map((p) => {
      const text = p.text.slice(0, Math.max(0, left));
      left -= text.length;
      return { ...p, text };
    })
    .filter((p) => p.text);
}

/** A résumé's text: a PDF page by page, a DOCX as one piece. */
export async function readResume(bytes: Uint8Array, name: string): Promise<Read> {
  if (bytes.length > MAX_RESUME_BYTES) return { ok: false, error: 'That file is over 10 MB.' };
  const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // PK: a DOCX is a zip
  let pages: Page[];
  try {
    if (isPdf) {
      const { extractText } = await import('unpdf');
      const { totalPages, text } = await extractText(new Uint8Array(bytes));
      if (totalPages > MAX_PAGES) return { ok: false, error: `That PDF has ${totalPages} pages; a résumé of up to ${MAX_PAGES} works.` };
      pages = text.map((t, i) => ({ page: i + 1, text: tidy(t) }));
    } else if (isZip && /\.docx$/i.test(name)) {
      const mammoth = await import('mammoth');
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      pages = [{ page: null, text: tidy(value) }];
    } else {
      return { ok: false, error: 'Only PDF and Word (.docx) files work for now.' };
    }
  } catch {
    return { ok: false, error: 'That file couldn’t be opened. It may be damaged or password-protected.' };
  }
  if (pages.reduce((n, p) => n + p.text.length, 0) < 40) {
    return { ok: false, error: 'There’s no text in that file to read (it may be a scanned image). Try the original PDF or a .docx.' };
  }
  return { ok: true, kind: 'resume', name, url: null, pages: cap(pages) };
}

/** Up to three links in a message, as the person wrote them. */
export function linksIn(text: string): string[] {
  const found = text.match(/https?:\/\/[^\s<>"'`，。、；：！？）】》]+/gi) ?? [];
  return [...new Set(found.map((u) => u.replace(/[.,;:!?)\]]+$/, '')))].slice(0, MAX_LINKS);
}

// Addresses a link must never reach from the server: this machine, the private network, the cloud
// metadata service.
function privateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v.startsWith('::ffff:')) return privateAddress(v.slice(7));
    return v === '::' || v === '::1' || /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
  }
  const [a, b] = ip.split('.').map(Number) as [number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

async function publicHost(url: URL): Promise<boolean> {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  if (url.username || url.password || (url.port && !['80', '443'].includes(url.port))) return false;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  try {
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    return addresses.length > 0 && addresses.every((a) => !privateAddress(a.address));
  } catch {
    return false;
  }
}

/** GET a public page, following up to three redirects, each checked again; at most 2 MB. */
async function fetchPublic(start: URL, accept: string): Promise<{ url: URL; type: string; body: string } | string> {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    if (!(await publicHost(url))) return 'that address isn’t a public web page';
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
        headers: { accept, 'user-agent': 'PortraitBot/1.0 (reads pages a person shares with their own portrait)' },
      });
    } catch {
      return 'the page didn’t answer';
    }
    const next = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && next) {
      url = new URL(next, url);
      continue;
    }
    if (!res.ok) return `the page answered ${res.status}`;
    const type = res.headers.get('content-type') ?? '';
    if (!/text\/html|text\/plain|application\/json|application\/xhtml/.test(type)) return 'it isn’t a web page';
    const reader = res.body?.getReader();
    if (!reader) return 'the page was empty';
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2 * 1024 * 1024) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    return { url, type, body: new TextDecoder().decode(Buffer.concat(chunks)) };
  }
  return 'it redirected too many times';
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s: string) =>
  s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1]?.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });

/** A page's readable text. The HTML itself is never shown to anyone. */
function htmlText(html: string): { title: string | null; text: string } {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1];
  const body = html
    .replace(/<(script|style|noscript|svg|template|iframe|title)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article|\/header|\/footer)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    // Inline tags leave a space before punctuation ("<b>this</b>, that").
    .replace(/ +([,.;:!?%)])/g, '$1');
  return {
    title: title ? tidy(decode(title)).slice(0, 200) || null : null,
    text: tidy(decode([description ?? '', body].join('\n'))),
  };
}

async function readGitHub(user: string, url: string): Promise<Read> {
  const headers: Record<string, string> = { accept: 'application/vnd.github+json', 'user-agent': 'PortraitBot/1.0' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const get = async (path: string) => {
    const res = await fetch(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(8000) });
    if (res.status === 404) throw new Error('missing');
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  };
  type Repo = {
    name: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    topics?: string[];
    fork: boolean;
    pushed_at: string;
    homepage: string | null;
  };
  let profile: Record<string, unknown>;
  let repos: Repo[];
  try {
    [profile, repos] = await Promise.all([get(`/users/${user}`), get(`/users/${user}/repos?per_page=100&sort=pushed`)]);
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message === 'missing' ? 'there’s no GitHub account by that name' : 'GitHub didn’t answer' };
  }
  const own = repos
    .filter((r) => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count || b.pushed_at.localeCompare(a.pushed_at))
    .slice(0, 15);
  const languages = Object.entries(
    own.reduce<Record<string, number>>((n, r) => (r.language ? { ...n, [r.language]: (n[r.language] ?? 0) + 1 } : n), {}),
  )
    .sort((a, b) => b[1] - a[1])
    .map(([l, n]) => `${l} (${n})`);
  const field = (k: string) => (typeof profile[k] === 'string' && profile[k] ? `${k}: ${profile[k]}` : null);
  const text = [
    `GitHub user ${user}`,
    field('name'),
    field('bio'),
    field('company'),
    field('location'),
    field('blog'),
    `public repositories: ${profile.public_repos ?? own.length}; followers: ${profile.followers ?? 0}`,
    languages.length ? `languages across their own repositories: ${languages.join(', ')}` : null,
    '',
    'Their own repositories (most starred first):',
    ...own.map((r) =>
      [
        `- ${r.name}`,
        r.description ? `: ${r.description}` : '',
        ` [${[r.language, `${r.stargazers_count} stars`, r.forks_count ? `${r.forks_count} forks` : null, `last pushed ${r.pushed_at.slice(0, 10)}`].filter(Boolean).join(', ')}]`,
        r.topics?.length ? ` topics: ${r.topics.join(', ')}` : '',
        r.homepage ? ` site: ${r.homepage}` : '',
      ].join(''),
    ),
  ]
    .filter((l) => l !== null)
    .join('\n');
  return { ok: true, kind: 'github', name: `GitHub · ${user}`, url, pages: cap([{ page: null, text }]) };
}

/** A link's text: a GitHub profile through GitHub's API, any other public page as it reads. */
export async function readLink(raw: string): Promise<Read> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: 'that isn’t a link' };
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) {
    return { ok: false, error: 'LinkedIn pages can’t be read. Save your profile as a PDF (More → Save to PDF) and attach it instead' };
  }
  if (host === 'github.com') {
    const user = url.pathname.split('/').filter(Boolean)[0];
    if (user && /^[a-z\d](?:[a-z\d-]{0,38})$/i.test(user)) return readGitHub(user, url.toString());
  }
  const page = await fetchPublic(url, 'text/html,text/plain;q=0.9');
  if (typeof page === 'string') return { ok: false, error: page };
  const { title, text } = page.type.includes('html') ? htmlText(page.body) : { title: null, text: tidy(page.body) };
  if (text.length < 40) return { ok: false, error: 'there’s no text on that page to read (it may need JavaScript)' };
  return { ok: true, kind: 'website', name: title ?? page.url.hostname, url: page.url.toString(), pages: cap([{ page: null, text }]) };
}

/** The person's sources, oldest first. */
export async function loadSources(supabase: SupabaseClient, ownerId: string): Promise<Source[]> {
  const { data } = await supabase
    .from('sources')
    .select('id, kind, name, url, pages')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })
    .returns<Source[]>();
  return data ?? [];
}

export async function saveSource(
  supabase: SupabaseClient,
  ownerId: string,
  read: Extract<Read, { ok: true }>,
  storagePath: string | null,
): Promise<Source> {
  const { data, error } = await supabase
    .from('sources')
    .insert({ owner_id: ownerId, kind: read.kind, name: read.name.slice(0, 200), url: read.url, storage_path: storagePath, pages: read.pages })
    .select('id, kind, name, url, pages')
    .single<Source>();
  if (error || !data) throw new Error(error?.message ?? 'Could not save the source');
  return data;
}

/** A source as the model reads it. The attributes are ours; everything inside is the document's. */
export function sourceBlock(s: Source): string {
  const attr = (v: string) => v.replace(/[<>"&]/g, '');
  const body = s.pages.map((p) => (p.page === null ? p.text : `[page ${p.page}]\n${p.text}`)).join('\n\n');
  return `<source kind="${s.kind}" name="${attr(s.name)}"${s.url ? ` url="${attr(s.url)}"` : ''}>\n${body.replace(/<\/source>/gi, '</ source>')}\n</source>`;
}

export const sourceError = (what: string, why: string) =>
  `<source_error about="${what.replace(/[<>"&]/g, '').slice(0, 200)}">The app couldn’t read it: ${why}.</source_error>`;
