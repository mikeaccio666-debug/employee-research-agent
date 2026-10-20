import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { supabaseEnv } from './env';

/** Supabase for Server Components, Server Actions and Route Handlers, acting as the signed-in person. */
export async function supabaseServer() {
  if (!supabaseEnv) return null;
  const store = await cookies();
  return createServerClient(supabaseEnv.url, supabaseEnv.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components cannot write cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

export type Visibility = 'public' | 'anonymous' | 'link' | 'hidden';

export type Profile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  alias: string;
  visibility: Visibility;
};

/** The signed-in person and their profile, or null (signed out, or Supabase not set up). */
export async function getViewer(): Promise<{ user: User; profile: Profile | null } | null> {
  const supabase = await supabaseServer();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, handle, display_name, alias, visibility')
    .eq('id', user.id)
    .maybeSingle<Profile>();
  return { user, profile: profile ?? null };
}
