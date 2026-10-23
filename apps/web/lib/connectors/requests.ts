import type { SupabaseClient } from '@supabase/supabase-js';

// Apps people asked for that can't be connected yet (supabase/migrations/…_connections.sql,
// app_requests): from the app store's "I want this", and from the agent when they mention an app
// it can't offer. One row per person and app, so the count across people is real demand.

/** A catalog id, or the name they used: lowercased, plain characters, at most 40. */
export const requestKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9 ._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[ ._-]+/, '')
    .slice(0, 40)
    .trim();

export async function requestApp(supabase: SupabaseClient, ownerId: string, name: string, source: 'store' | 'chat'): Promise<void> {
  const app = requestKey(name);
  if (!app) return;
  const { error } = await supabase.from('app_requests').upsert({ owner_id: ownerId, app, source }, { onConflict: 'owner_id,app', ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function withdrawRequest(supabase: SupabaseClient, ownerId: string, name: string): Promise<void> {
  const { error } = await supabase.from('app_requests').delete().eq('owner_id', ownerId).eq('app', requestKey(name));
  if (error) throw new Error(error.message);
}

/** The apps this person asked for. Empty if the table isn't there yet. */
export async function requestsOf(supabase: SupabaseClient, ownerId: string): Promise<string[]> {
  const { data } = await supabase.from('app_requests').select('app').eq('owner_id', ownerId).returns<{ app: string }[]>();
  return (data ?? []).map((r) => r.app);
}
