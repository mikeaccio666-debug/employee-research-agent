'use server';

import { revalidatePath } from 'next/cache';
import type { Visibility } from '@/lib/data/entry';
import { handleProblem, normalizeHandle, toDbVisibility } from '@/lib/account';
import { supabaseServer } from '@/lib/supabase/server';
import { loadPortrait } from '@/lib/agent/store';
import { publishedSpec } from '@/lib/portrait/spec';

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
  // Publishing copies the confirmed lines to the page (publishedSpec); the draft keeps changing.
  const update = published
    ? {
        status: 'published',
        published_at: new Date().toISOString(),
        published_spec: publishedSpec((await loadPortrait(supabase, user.id)).spec),
      }
    : { status: 'draft' };
  const { error } = await supabase.from('portraits').update(update).eq('owner_id', user.id);
  if (error) return { ok: false, error: FAILED };
  refreshPortraits();
  return { ok: true };
}

export type FieldLevels = Record<'wa' | 'pay' | 'ct', 0 | 1 | 2>;
const FIELDS = ['wa', 'pay', 'ct'] as const;

/** Who may see each sensitive field (PRIV-02). Read by matching and connections, never by the page. */
export async function saveFieldLevels(levels: FieldLevels): Promise<Result> {
  const clean = Object.fromEntries(FIELDS.map((f) => [f, levels[f]]));
  if (!FIELDS.every((f) => [0, 1, 2].includes(levels[f]))) return { ok: false, error: FAILED };
  const session = await signedIn();
  if (!session) return { ok: false, error: NOT_SIGNED_IN };
  const { error } = await session.supabase.from('profiles').update({ field_levels: clean }).eq('id', session.user.id);
  return error ? { ok: false, error: FAILED } : { ok: true };
}

/** A fresh random alias (PRIV-05). The database draws it, so it can't come from the person's name. */
export async function renewAlias(): Promise<Result<{ alias: string }>> {
  const session = await signedIn();
  if (!session) return { ok: false, error: NOT_SIGNED_IN };
  const { data, error } = await session.supabase.rpc('renew_alias');
  if (error || typeof data !== 'string') return { ok: false, error: FAILED };
  return { ok: true, alias: data };
}

/**
 * Deletes the account now (PRIV-06): their résumé files first, through Storage, then the sign-in,
 * which takes the profile, portrait, history, chats and sources with it. They are signed out after.
 */
export async function deleteAccount(confirm: string): Promise<Result> {
  if (confirm.trim().toLowerCase() !== 'delete') return { ok: false, error: 'Type delete to confirm.' };
  const session = await signedIn();
  if (!session) return { ok: false, error: NOT_SIGNED_IN };
  const { supabase, user } = session;
  const folder = user.id;
  for (;;) {
    const { data: files, error } = await supabase.storage.from('sources').list(folder, { limit: 100 });
    if (error) return { ok: false, error: FAILED };
    if (!files?.length) break;
    const { error: removeError } = await supabase.storage.from('sources').remove(files.map((f) => `${folder}/${f.name}`));
    if (removeError) return { ok: false, error: FAILED };
    if (files.length < 100) break;
  }
  const { error } = await supabase.rpc('delete_my_account');
  if (error) return { ok: false, error: FAILED };
  await supabase.auth.signOut();
  refreshPortraits();
  return { ok: true };
}
