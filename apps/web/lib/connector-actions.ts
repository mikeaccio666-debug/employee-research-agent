'use server';

import { isConnectorId } from '@/lib/connectors/catalog';
import { removeConnection } from '@/lib/connectors/store';
import { supabaseServer } from '@/lib/supabase/server';
import type { Result } from '@/lib/account-actions';

// Disconnecting an app from the studio: its tokens are deleted, so the agent can't read from it
// again. Pages already read stay among the person's documents, like a link they shared.

export async function disconnectApp(id: string): Promise<Result> {
  if (!isConnectorId(id)) return { ok: false, error: 'There is no such app.' };
  const supabase = await supabaseServer();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) return { ok: false, error: 'You’re signed out. Sign in again to save.' };
  try {
    await removeConnection(supabase, user.id, id);
  } catch {
    return { ok: false, error: 'That didn’t save. Try again in a moment.' };
  }
  return { ok: true };
}
