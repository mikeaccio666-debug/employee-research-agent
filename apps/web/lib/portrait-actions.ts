'use server';

import { revalidatePath } from 'next/cache';
import { loadPortrait } from '@/lib/agent/store';
import { entries, restoreVersion, revertChange, type MadeBy, type VersionEntry } from '@/lib/portrait/history';
import { headlineWithout, LIMITS, PREFERENCE_FIELDS, publishedSpec, readSpec, type PreferenceField, type Spec } from '@/lib/portrait/spec';
import { supabaseServer } from '@/lib/supabase/server';
import type { Result } from '@/lib/account-actions';

// The person's answers to the agent's drafts in the studio: confirm or reject a line, confirm the
// headline, and send the confirmed portrait to the published page. Like account-actions, these
// act as the signed-in person; row-level security limits them to their own portrait.

const NOT_SIGNED_IN = 'You’re signed out. Sign in again to save.';
const FAILED = 'That didn’t save. Try again in a moment.';

async function edit(change: (spec: Spec) => Spec | string, by: MadeBy = 'person'): Promise<Result<{ spec: Spec }>> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: FAILED };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };
  const { spec } = await loadPortrait(supabase, user.id);
  const next = change(spec);
  if (typeof next === 'string') return { ok: false, error: next };
  // "_by" tells the version history who made the change; the database trigger takes it off.
  const { error } = await supabase
    .from('portraits')
    .update({ spec: { ...next, _by: by } })
    .eq('owner_id', user.id);
  if (error) return { ok: false, error: FAILED };
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

/** The person rewrites a line themselves (STU-07): it is theirs now, so it is confirmed and pinned. */
export async function editLine(id: string, text: string) {
  const statement = text.trim().replace(/\s+/g, ' ');
  if (!statement) return { ok: false as const, error: 'Write something, or use Not right to take the line off.' };
  if (statement.length > LIMITS.statement) return { ok: false as const, error: `At most ${LIMITS.statement} characters.` };
  return edit((spec) => {
    const line = spec.claims.find((c) => c.id === id);
    if (!line) return 'That line is gone. Refresh to see the latest.';
    if (line.statement === statement && line.status === 'confirmed') return spec;
    const claims = spec.claims.map((c) =>
      c.id === id ? { ...c, statement, status: 'confirmed' as const, pinned: true, updatedAt: new Date().toISOString() } : c,
    );
    return { ...spec, rev: spec.rev + 1, claims };
  });
}

type VersionRow = { id: number; rev: number; spec: unknown; made_by: MadeBy; created_at: string };

/** The kept versions, newest first, each with what it changed. */
export async function loadHistory(): Promise<Result<{ versions: VersionEntry[] }>> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: FAILED };
  const { data, error } = await supabase
    .from('portrait_versions')
    .select('id, rev, spec, made_by, created_at')
    .order('id', { ascending: false })
    .limit(50)
    .returns<VersionRow[]>();
  if (error) return { ok: false, error: 'History isn’t available yet.' };
  const versions = entries(data.map((v) => ({ id: v.id, rev: v.rev, madeBy: v.made_by, at: v.created_at, spec: readSpec(v.spec) })));
  return { ok: true, versions };
}

/** A version and the one before it, read as the person (row-level security keeps it to their own). */
async function versionPair(id: number) {
  const supabase = await supabaseServer();
  if (!supabase) return null;
  const { data } = await supabase
    .from('portrait_versions')
    .select('id, rev, spec, made_by, created_at')
    .lte('id', id)
    .order('id', { ascending: false })
    .limit(2)
    .returns<VersionRow[]>();
  const [after, before] = data ?? [];
  return after?.id === id ? { after: readSpec(after.spec), before: before ? readSpec(before.spec) : null } : null;
}

/** Undo one change, whoever made it, and keep everything since. */
export async function undoChange(id: number): Promise<Result<{ spec: Spec; skipped: number }>> {
  const pair = await versionPair(id);
  if (!pair?.before) return { ok: false, error: 'That change can’t be undone on its own. Go back to a version instead.' };
  let skipped = 0;
  const r = await edit((spec) => {
    const out = revertChange(pair.before, pair.after, spec);
    skipped = out.skipped;
    return out.spec;
  }, 'undo');
  return r.ok ? { ...r, skipped } : r;
}

/** Go back to how the portrait was at a version. Later versions stay in the history. */
export async function restoreTo(id: number) {
  const pair = await versionPair(id);
  if (!pair) return { ok: false as const, error: 'That version is gone. Refresh to see the latest.' };
  return edit((spec) => restoreVersion(pair.after, spec), 'undo');
}
