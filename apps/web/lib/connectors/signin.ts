import { randomBytes } from 'node:crypto';
import { auth as authorize, exchangeAuthorization, startAuthorization } from '@modelcontextprotocol/sdk/client/auth.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { callbackUrl } from '@/lib/agent/connectors';
import { CONNECTORS, connectorUrl, registeredClient, type ApiReader, type ConnectorId, type McpReader } from './catalog';
import { ConnectionAuth, loadConnection, saveConnection, type Secret } from './store';

// Connecting an app (PRD ECO-01): the studio sends the person to /api/connectors/<id>/start,
// which sends them on to the app's sign-in page; the app sends them back to /callback with a
// code, which becomes their tokens. The `state` nonce ties the callback to the sign-in this person
// started, and PKCE ties the code to this server. An MCP app is found and (unless we registered
// in advance) registered with on the spot by the SDK; an API app has fixed endpoints.

/** Where to send the person to sign in to the app. */
export async function startSignIn(supabase: SupabaseClient, ownerId: string, id: ConnectorId, origin: string): Promise<URL> {
  const c = CONNECTORS[id];
  if (!c.reader) throw new Error(`${id}: not built yet`);
  const registered = c.signIn === 'registered' ? registeredClient(id) : null;
  if (c.signIn === 'registered' && !registered) throw new Error(`${id}: no registration`);
  const state = randomBytes(16).toString('base64url');
  const redirect = callbackUrl(origin, id);
  // A fresh secret each time, so a sign-in never reuses another origin's redirect address.
  const secret: Secret = {};
  let to: URL;
  if (c.reader.kind === 'mcp') {
    const auth = new ConnectionAuth(secret, redirect, state, undefined, registered);
    const result = await authorize(auth, { serverUrl: connectorUrl({ ...c, reader: c.reader }) });
    if (result !== 'REDIRECT' || !auth.authorizationUrl) throw new Error(`${id}: no sign-in page`);
    to = auth.authorizationUrl;
  } else {
    const { metadata, scope } = c.reader.adapter.oauth();
    const started = await startAuthorization(metadata.issuer, { metadata, clientInformation: registered!, redirectUrl: redirect, scope, state });
    secret.verifier = started.codeVerifier;
    to = started.authorizationUrl;
  }
  await saveConnection(supabase, ownerId, { provider: id, status: 'pending', state, secret });
  return to;
}

/** Turns the code the app sent back into tokens. False if this isn't the sign-in the person started. */
export async function finishSignIn(
  supabase: SupabaseClient,
  ownerId: string,
  id: ConnectorId,
  origin: string,
  { code, state }: { code: string; state: string },
): Promise<boolean> {
  const c = CONNECTORS[id];
  if (!c.reader) return false;
  const conn = await loadConnection(supabase, ownerId, id);
  if (!conn || conn.status !== 'pending' || !conn.state || conn.state !== state || !conn.secret.verifier) return false;
  const registered = c.signIn === 'registered' ? registeredClient(id) : null;
  const redirect = callbackUrl(origin, id);
  const finished = c.reader.kind === 'mcp' ? await finishMcp(c.reader, conn.secret, redirect, conn.state, code, registered, id) : await finishApi(c.reader, conn.secret, redirect, code, registered);
  if (!finished) return false;
  await saveConnection(supabase, ownerId, { provider: id, status: 'active', state: null, secret: finished });
  return true;
}

async function finishMcp(reader: McpReader, secret: Secret, redirect: string, state: string, code: string, registered: ReturnType<typeof registeredClient>, id: ConnectorId) {
  const auth = new ConnectionAuth(secret, redirect, state, undefined, registered);
  const result = await authorize(auth, { serverUrl: connectorUrl({ ...CONNECTORS[id], reader }), authorizationCode: code });
  if (result !== 'AUTHORIZED' || !auth.secret.tokens) return null;
  return { client: auth.secret.client, tokens: auth.secret.tokens } satisfies Secret;
}

async function finishApi(reader: ApiReader, secret: Secret, redirect: string, code: string, registered: ReturnType<typeof registeredClient>) {
  if (!registered || !secret.verifier) return null;
  const { metadata } = reader.adapter.oauth();
  const tokens = await exchangeAuthorization(metadata.issuer, {
    metadata,
    clientInformation: { ...registered, token_endpoint_auth_method: 'client_secret_post' },
    authorizationCode: code,
    codeVerifier: secret.verifier,
    redirectUri: redirect,
  });
  return { tokens } satisfies Secret;
}
