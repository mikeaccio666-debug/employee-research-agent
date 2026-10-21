import { createHash, randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

// A stand-in for a connected app's remote MCP server, for tests: OAuth with dynamic client
// registration and PKCE (as Notion's does), then MCP over streamable HTTP with a search tool, a
// fetch tool and a write tool the app must never call. Everything lives in memory.

export type FakeApp = {
  url: string;
  /** What the person's browser does at the sign-in page: consents, and is sent back with a code. */
  consent(authorizationUrl: URL): { code: string; state: string };
  /** Expires every access token, so the next call has to refresh. */
  expireTokens(): void;
  /** Forgets every token, refresh tokens too: the person signed out of us on the app's side. */
  revokeAll(): void;
  /** Tokens we asked the app to forget (RFC 7009), as their type hints. */
  revoked: string[];
  calls: { tool: string; args: unknown }[];
  close(): Promise<void>;
};

const PAGES: Record<string, string> = {
  'page-1': '# Campus Marketplace write-up\nI rebuilt the listings search in March 2025. Search time went from 4 seconds to under 1 second.',
};

export async function fakeApp(): Promise<FakeApp> {
  const clients = new Map<string, { redirect_uris: string[] }>();
  const codes = new Map<string, { client: string; challenge: string; redirect: string }>();
  const access = new Set<string>();
  const refresh = new Set<string>();
  const calls: FakeApp['calls'] = [];
  const revoked: string[] = [];
  let base = '';

  const json = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
    res.writeHead(status, { 'content-type': 'application/json', ...headers });
    res.end(JSON.stringify(body));
  };
  const body = async (req: IncomingMessage) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    return Buffer.concat(chunks).toString('utf8');
  };
  const issue = () => {
    const a = randomUUID();
    const r = randomUUID();
    access.add(a);
    refresh.add(r);
    return { access_token: a, refresh_token: r, token_type: 'bearer', expires_in: 3600 };
  };

  const mcp = () => {
    const server = new McpServer({ name: 'fake-notion', version: '1.0.0' });
    server.registerTool('notion-search', { inputSchema: { query: z.string() }, annotations: { readOnlyHint: true } }, async ({ query }) => {
      calls.push({ tool: 'notion-search', args: { query } });
      return { content: [{ type: 'text', text: `Results for "${query}":\n- page-1: Campus Marketplace write-up` }] };
    });
    server.registerTool('notion-fetch', { inputSchema: { id: z.string() }, annotations: { readOnlyHint: true } }, async ({ id }) => {
      calls.push({ tool: 'notion-fetch', args: { id } });
      const page = PAGES[id];
      return page ? { content: [{ type: 'text', text: page }] } : { isError: true, content: [{ type: 'text', text: `No page ${id}` }] };
    });
    server.registerTool('notion-create-pages', { inputSchema: { title: z.string() } }, async ({ title }) => {
      calls.push({ tool: 'notion-create-pages', args: { title } });
      return { content: [{ type: 'text', text: 'created' }] };
    });
    return server;
  };

  const http: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', base);
    if (url.pathname.startsWith('/.well-known/oauth-protected-resource')) {
      return json(res, 200, { resource: `${base}/mcp`, authorization_servers: [base] });
    }
    if (url.pathname.startsWith('/.well-known/oauth-authorization-server')) {
      return json(res, 200, {
        issuer: base,
        authorization_endpoint: `${base}/authorize`,
        token_endpoint: `${base}/token`,
        registration_endpoint: `${base}/register`,
        revocation_endpoint: `${base}/revoke`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none'],
      });
    }
    if (url.pathname === '/register' && req.method === 'POST') {
      const meta = JSON.parse(await body(req));
      const client_id = randomUUID();
      clients.set(client_id, meta);
      return json(res, 201, { ...meta, client_id, client_id_issued_at: Math.floor(Date.now() / 1000) });
    }
    if (url.pathname === '/token' && req.method === 'POST') {
      const form = new URLSearchParams(await body(req));
      if (form.get('grant_type') === 'authorization_code') {
        const code = codes.get(form.get('code') ?? '');
        codes.delete(form.get('code') ?? '');
        const verifier = form.get('code_verifier') ?? '';
        const ok =
          code &&
          code.client === form.get('client_id') &&
          code.redirect === form.get('redirect_uri') &&
          createHash('sha256').update(verifier).digest('base64url') === code.challenge;
        return ok ? json(res, 200, issue()) : json(res, 400, { error: 'invalid_grant' });
      }
      if (form.get('grant_type') === 'refresh_token') {
        const r = form.get('refresh_token') ?? '';
        if (!refresh.delete(r)) return json(res, 400, { error: 'invalid_grant' });
        return json(res, 200, issue());
      }
      return json(res, 400, { error: 'unsupported_grant_type' });
    }
    if (url.pathname === '/revoke' && req.method === 'POST') {
      const form = new URLSearchParams(await body(req));
      const token = form.get('token') ?? '';
      if (clients.has(form.get('client_id') ?? '') && (access.delete(token) || refresh.delete(token))) revoked.push(form.get('token_type_hint') ?? '?');
      return json(res, 200, {});
    }
    if (url.pathname === '/mcp') {
      const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
      if (!token || !access.has(token)) {
        return json(res, 401, { error: 'invalid_token' }, {
          'www-authenticate': `Bearer error="invalid_token", resource_metadata="${base}/.well-known/oauth-protected-resource/mcp"`,
        });
      }
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      const server = mcp();
      res.on('close', () => {
        void transport.close();
        void server.close();
      });
      await server.connect(transport);
      const raw = req.method === 'POST' ? await body(req) : '';
      return transport.handleRequest(req, res, raw ? JSON.parse(raw) : undefined);
    }
    res.writeHead(404).end();
  });

  await new Promise<void>((done) => http.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;

  return {
    url: `${base}/mcp`,
    calls,
    revoked,
    consent(authorizationUrl) {
      const q = authorizationUrl.searchParams;
      const client = clients.get(q.get('client_id') ?? '');
      const redirect = q.get('redirect_uri') ?? '';
      if (!client || !client.redirect_uris.includes(redirect)) throw new Error('unknown client or redirect');
      if (q.get('code_challenge_method') !== 'S256' || !q.get('code_challenge')) throw new Error('no PKCE');
      const code = randomUUID();
      codes.set(code, { client: q.get('client_id')!, challenge: q.get('code_challenge')!, redirect });
      return { code, state: q.get('state') ?? '' };
    },
    expireTokens: () => access.clear(),
    revokeAll: () => {
      access.clear();
      refresh.clear();
    },
    close: () => new Promise((done) => http.close(() => done())),
  };
}
