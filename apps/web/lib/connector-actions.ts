'use server';

import { isConnectorId } from '@/lib/connectors/catalog';
import { requestApp, requestKey, withdrawRequest } from '@/lib/connectors/requests';
import { revokeTokens } from '@/lib/connectors/revoke';
import { loadConnection, removeConnection } from '@/lib/connectors/store';
import { supabaseServer } from '@/lib/supabase/server';
import type { Result } from '@/lib/account-actions';

// The app store's and the studio's writes. Disconnecting an app tells the app to forget the
// tokens and deletes them, so the agent can't read from it again; pages already read stay among
// the person's documents, like a link they shared. Asking for an app that isn't here yet counts
// it (lib/connectors/requests.ts).

const NOT_SIGNED_IN = 'You’re signed out. Sign in again to save.';
const FAILED = 'That didn’t save. Try again in a moment.';

async function signedIn() {
  const supabase = await supabaseServer();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  return supabase && user ? { supabase, user } : null;
}

export async function disconnectApp(id: string): Promise<Result> {
  if (!isConnectorId(id)) return { ok: false, error: 'There is no such app.' };
  const session = await signedIn();
  if (!session) return { ok: false, error: NOT_SIGNED_IN };
  try {
    const conn = await loadConnection(session.supabase, session.user.id, id);
    if (conn) await revokeTokens(id, conn.secret);
    await removeConnection(session.supabase, session.user.id, id);
  } catch {
    return { ok: false, error: FAILED };
  }
  return { ok: true };
}

/** "I want this": an app from the catalog that isn't ready, or one they name. */
export async function askForApp(name: string): Promise<Result<{ app: string }>> {
  const app = requestKey(name);
  if (!app) return { ok: false, error: 'Write the app’s name.' };
  const session = await signedIn();
  if (!session) return { ok: false, error: NOT_SIGNED_IN };
  try {
    await requestApp(session.supabase, session.user.id, app, 'store');
  } catch {
    return { ok: false, error: FAILED };
  }
  return { ok: true, app };
}

export async function withdrawAppRequest(name: string): Promise<Result> {
  const session = await signedIn();
  if (!session) return { ok: false, error: NOT_SIGNED_IN };
  try {
    await withdrawRequest(session.supabase, session.user.id, name);
  } catch {
    return { ok: false, error: FAILED };
  }
  return { ok: true };
}
