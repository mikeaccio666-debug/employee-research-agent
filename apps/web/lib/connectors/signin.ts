import { randomBytes } from 'node:crypto';
import { auth as authorize } from '@modelcontextprotocol/sdk/client/auth.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { callbackUrl } from '@/lib/agent/connectors';
import { CONNECTORS, connectorUrl, type ConnectorId } from './catalog';
import { ConnectionAuth, loadConnection, saveConnection, type Secret } from './store';

// Connecting an app (PRD ECO-01): the studio sends the person to /api/connectors/<id>/start,
// which registers us with the app's MCP server and sends them on to its sign-in page; the app
// sends them back to /callback with a code, which becomes their tokens. The `state` nonce ties the
// callback to the sign-in this person started, and PKCE ties the code to this server.

/** Where to send the person to sign in to the app. */
export async function startSignIn(supabase: SupabaseClient, ownerId: string, id: ConnectorId, origin: string): Promise<URL> {
  const state = randomBytes(16).toString('base64url');
  // A fresh registration each time, so a sign-in never reuses another origin's redirect address.
  const secret: Secret = {};
  const auth = new ConnectionAuth(secret, callbackUrl(origin, id), state);
  const result = await authorize(auth, { serverUrl: connectorUrl(CONNECTORS[id]) });
  if (result !== 'REDIRECT' || !auth.authorizationUrl) throw new Error(`${id}: no sign-in page`);
  await saveConnection(supabase, ownerId, { provider: id, status: 'pending', state, secret });
  return auth.authorizationUrl;
}

/** Turns the code the app sent back into tokens. False if this isn't the sign-in the person started. */
export async function finishSignIn(
  supabase: SupabaseClient,
  ownerId: string,
  id: ConnectorId,
  origin: string,
  { code, state }: { code: string; state: string },
): Promise<boolean> {
  const conn = await loadConnection(supabase, ownerId, id);
  if (!conn || conn.status !== 'pending' || !conn.state || conn.state !== state || !conn.secret.verifier) return false;
  const auth = new ConnectionAuth(conn.secret, callbackUrl(origin, id), conn.state);
  const result = await authorize(auth, { serverUrl: connectorUrl(CONNECTORS[id]), authorizationCode: code });
  if (result !== 'AUTHORIZED' || !auth.secret.tokens) return false;
  await saveConnection(supabase, ownerId, { provider: id, status: 'active', state: null, secret: { client: auth.secret.client, tokens: auth.secret.tokens } });
  return true;
}
