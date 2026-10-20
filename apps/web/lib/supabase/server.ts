import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { supabaseEnv } from './env';
import { toUiVisibility, type Account } from '@/lib/account';

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

export type Viewer = { user: User; profile: Profile | null };

/** The signed-in person and their profile, or null (signed out, or Supabase not set up). */
export async function getViewer(): Promise<Viewer | null> {
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

/** The signed-in person's account for the settings and publish screens, or null when signed out. */
export async function getAccount(viewer: Viewer | null): Promise<Account | null> {
  const supabase = await supabaseServer();
  if (!supabase || !viewer?.profile) return null;
  const { data: portrait } = await supabase
    .from('portraits')
    .select('status')
    .eq('owner_id', viewer.user.id)
    .maybeSingle<{ status: 'draft' | 'published' }>();
  const p = viewer.profile;
  return {
    handle: p.handle,
    displayName: p.display_name,
    alias: p.alias,
    visibility: toUiVisibility(p.visibility),
    published: portrait?.status === 'published',
  };
}

/**
 * For screens that save to the account: signed-out people go to sign in first and come back.
 * Null when Supabase isn't set up, and the screen shows its example data as before.
 */
export async function accountFor(path: string): Promise<Account | null> {
  const viewer = await getViewer();
  if (supabaseEnv && !viewer) redirect(`/login?next=${encodeURIComponent(path)}`);
  return getAccount(viewer);
}
