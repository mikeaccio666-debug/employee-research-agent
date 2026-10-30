import { discoverAuthorizationServerMetadata, discoverOAuthProtectedResourceMetadata } from '@modelcontextprotocol/sdk/client/auth.js';
import { CONNECTORS, connectorUrl, registeredClient, type ConnectorId } from './catalog';
import type { Secret } from './store';

// When they disconnect an app, the app is told to forget the tokens too (RFC 7009 token
// revocation for an MCP app that offers it, the adapter's own call for an API app), so a copy of
// a token from before can't read anything either. Best effort: the row is deleted regardless.

const TIMEOUT_MS = 5_000;

export async function revokeTokens(id: ConnectorId, secret: Secret): Promise<void> {
  const c = CONNECTORS[id];
  const tokens = secret.tokens;
  if (!c.reader || !tokens) return;
  const registered = c.signIn === 'registered' ? registeredClient(id) : null;
  try {
    if (c.reader.kind === 'api') {
      if (registered) await c.reader.adapter.revoke?.(tokens.access_token, registered);
      return;
    }
    const client = registered ?? secret.client;
    if (!client) return;
    const timed: typeof fetch = (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const server = connectorUrl({ ...c, reader: c.reader });
    const resource = await discoverOAuthProtectedResourceMetadata(server, undefined, timed).catch(() => null);
    const issuer = resource?.authorization_servers?.[0] ?? new URL('/', server).toString();
    const metadata = await discoverAuthorizationServerMetadata(issuer, { fetchFn: timed });
    // Not in the SDK's type, though RFC 8414 lists it and servers send it.
    const endpoint = (metadata as { revocation_endpoint?: string } | undefined)?.revocation_endpoint;
    if (!endpoint) return;
    // Revoking the refresh token ends the grant at most apps; the access token goes too, for the rest.
    for (const [token, hint] of [
      [tokens.refresh_token, 'refresh_token'],
      [tokens.access_token, 'access_token'],
    ] as const) {
      if (!token) continue;
      const body = new URLSearchParams({ token, token_type_hint: hint, client_id: client.client_id });
      if (client.client_secret) body.set('client_secret', client.client_secret);
      await timed(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    }
  } catch (e) {
    console.error('connector token revocation failed', { connector: id, error: e instanceof Error ? e.message : e });
  }
}
