import { createClient } from '@supabase/supabase-js';
import { supabaseEnv } from './env';

/**
 * Supabase as a visitor: no cookies, so pages that read through it (public portraits) can be
 * cached and served from the CDN. It sees only what the anon role may read.
 */
export const supabasePublic = supabaseEnv
  ? createClient(supabaseEnv.url, supabaseEnv.key, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

export type PublicPortrait = {
  handle: string;
  display_name: string | null;
  spec: Record<string, unknown>;
  published_at: string | null;
};

/** A published, public portrait by handle, or null. */
export async function getPublicPortrait(handle: string): Promise<PublicPortrait | null> {
  if (!supabasePublic) return null;
  const { data } = await supabasePublic
    .from('public_portraits')
    .select('handle, display_name, spec, published_at')
    .eq('handle', handle)
    .maybeSingle<PublicPortrait>();
  return data ?? null;
}
