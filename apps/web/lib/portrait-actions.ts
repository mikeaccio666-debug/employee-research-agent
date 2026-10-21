'use server';

import { revalidatePath } from 'next/cache';
import { loadPortrait, saveSpec } from '@/lib/agent/store';
import { headlineWithout, PREFERENCE_FIELDS, publishedSpec, type PreferenceField, type Spec } from '@/lib/portrait/spec';
import { supabaseServer } from '@/lib/supabase/server';
import type { Result } from '@/lib/account-actions';

// The person's answers to the agent's drafts in the studio: confirm or reject a line, confirm the
// headline, and send the confirmed portrait to the published page. Like account-actions, these
// act as the signed-in person; row-level security limits them to their own portrait.

const NOT_SIGNED_IN = 'You’re signed out. Sign in again to save.';
const FAILED = 'That didn’t save. Try again in a moment.';

async function edit(change: (spec: Spec) => Spec | string): Promise<Result<{ spec: Spec }>> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: FAILED };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };
  const { spec } = await loadPortrait(supabase, user.id);
  const next = change(spec);
  if (typeof next === 'string') return { ok: false, error: next };
  try {
    await saveSpec(supabase, user.id, next);
  } catch {
    return { ok: false, error: FAILED };
  }
  return { ok: true, spec: next };
}

const setStatus = (id: string, status: 'confirmed' | 'rejected') => (spec: Spec) => {
  if (!spec.claims.some((c) => c.id === id)) return 'That line is gone. Refresh to see the latest.';
  const claims = spec.claims.map((c) => (c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c));
  // A headline (or an alternative) resting on a rejected line comes down with it.
  const headline = status === 'rejected' ? headlineWithout(spec.headline, id) : spec.headline;
  return { ...spec, rev: spec.rev + 1, claims, headline };
};

/** "Right": the line can go on the page. */
export async function confirmLine(id: string) {
  return edit(setStatus(id, 'confirmed'));
}

/** "Not right": the line leaves the portrait, and the agent won't propose it again. */
export async function rejectLine(id: string) {
  return edit(setStatus(id, 'rejected'));
}

export async function confirmHeadline() {
  return edit((spec) =>
    spec.headline
      ? { ...spec, rev: spec.rev + 1, headline: { ...spec.headline, status: 'confirmed', alternatives: [] } }
      : 'There is no headline yet.',
  );
}

/** Picking one of the other headlines the agent offered: it becomes the confirmed headline. */
export async function chooseHeadline(index: number) {
  return edit((spec) => {
    const pick = spec.headline?.alternatives[index];
    if (!pick) return 'That headline is gone. Refresh to see the latest.';
    return { ...spec, rev: spec.rev + 1, headline: { ...pick, status: 'confirmed', alternatives: [] } };
  });
}

/** Send the confirmed lines to the published page (only for a portrait that is already published). */
export async function updatePage(): Promise<Result> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: FAILED };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };
  const { spec, published } = await loadPortrait(supabase, user.id);
  if (!published) return { ok: false, error: 'Publish your portrait first.' };
  const { error } = await supabase
    .from('portraits')
    .update({ published_spec: publishedSpec(spec), published_at: new Date().toISOString() })
    .eq('owner_id', user.id);
  if (error) return { ok: false, error: FAILED };
  revalidatePath('/u/[handle]', 'page');
  return { ok: true };
}

/** Clearing one of their search preferences in the studio. Matching only, so the page's rev stays. */
export async function clearPreference(field: PreferenceField) {
  if (!PREFERENCE_FIELDS.includes(field)) return { ok: false as const, error: FAILED };
  return edit((spec) => ({ ...spec, preferences: { ...spec.preferences, [field]: Array.isArray(spec.preferences[field]) ? [] : null } }));
}
