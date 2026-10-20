'use server';

import { revalidatePath } from 'next/cache';
import type { Visibility } from '@/lib/data/entry';
import { handleProblem, normalizeHandle, toDbVisibility } from '@/lib/account';
import { supabaseServer } from '@/lib/supabase/server';

// Writes for the signed-in person's own profile and portrait. Row-level security and the column
// grants in the migration are what actually limit them; these only turn errors into plain words.

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const VISIBILITIES: Visibility[] = ['public', 'anon', 'link', 'hidden'];
const NOT_SIGNED_IN = 'You’re signed out. Sign in again to save.';
const FAILED = 'That didn’t save. Try again in a moment.';

async function signedIn() {
  const supabase = await supabaseServer();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

// Public pages are cached; anything that changes who can see a portrait refreshes them.
const refreshPortraits = () => revalidatePath('/u/[handle]', 'page');

/** Claim or change the handle behind {domain}/@handle. */
export async function claimHandle(raw: string): Promise<Result<{ handle: string }>> {
  const handle = normalizeHandle(raw);
  const problem = handleProblem(handle);
  if (problem) return { ok: false, error: problem };
  const session = await signedIn();
  if (!session) return { ok: false, error: NOT_SIGNED_IN };
  const { error } = await session.supabase.from('profiles').update({ handle }).eq('id', session.user.id);
  if (error) {
    // 23505: unique violation, someone else has it.
    return { ok: false, error: error.code === '23505' ? 'That one is taken.' : FAILED };
  }
  refreshPortraits();
  return { ok: true, handle };
}

/** Who can see the portrait. */
export async function saveVisibility(visibility: Visibility): Promise<Result> {
  if (!VISIBILITIES.includes(visibility)) return { ok: false, error: FAILED };
  const session = await signedIn();
  if (!session) return { ok: false, error: NOT_SIGNED_IN };
  const { error } = await session.supabase
    .from('profiles')
    .update({ visibility: toDbVisibility(visibility) })
    .eq('id', session.user.id);
  if (error) return { ok: false, error: FAILED };
  refreshPortraits();
  return { ok: true };
}

/** Publish (or unpublish) the portrait with the chosen visibility. A named page needs a handle first. */
export async function setPublished(published: boolean, visibility?: Visibility): Promise<Result> {
  const session = await signedIn();
  if (!session) return { ok: false, error: NOT_SIGNED_IN };
  const { supabase, user } = session;
  if (published && visibility) {
    if (!VISIBILITIES.includes(visibility)) return { ok: false, error: FAILED };
    if (visibility === 'public' || visibility === 'link') {
      const { data } = await supabase.from('profiles').select('handle').eq('id', user.id).maybeSingle<{ handle: string | null }>();
      if (!data?.handle) return { ok: false, error: 'Choose your link first.' };
    }
    const { error } = await supabase
      .from('profiles')
      .update({ visibility: toDbVisibility(visibility) })
      .eq('id', user.id);
    if (error) return { ok: false, error: FAILED };
  }
  const { error } = await supabase
    .from('portraits')
    .update(published ? { status: 'published', published_at: new Date().toISOString() } : { status: 'draft' })
    .eq('owner_id', user.id);
  if (error) return { ok: false, error: FAILED };
  refreshPortraits();
  return { ok: true };
}
