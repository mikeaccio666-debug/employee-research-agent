'use server';

import { loadPortrait } from '@/lib/agent/store';
import { headers } from 'next/headers';
import { emptySpec } from '@/lib/portrait/spec';
import { defaultStyle, docFromPortrait, MAX, ResumeDoc, ResumeLetter, ResumeStyle } from '@/lib/resume/doc';
import { insertVersion, versionOf, type ResumeVersion } from '@/lib/resume/store';
import { routes } from '@/lib/routes';
import { getViewer, supabaseServer } from '@/lib/supabase/server';

// The résumé editor's writes (app/resume): make a version, save it, rename it, make it the
// default, delete it. Everything the browser sends is parsed against the same schema the page is
// read with; who it belongs to comes from the session.

export type ActionResult<T = null> = { ok: true; value: T } | { ok: false; error: string };

const NOT_SIGNED_IN = 'You’re signed out. Sign in again to save.';
const FAILED = 'That didn’t save. Try again in a moment.';
const STALE = 'This version changed in another tab. Reload to see the latest before saving.';

async function signedIn() {
  const supabase = await supabaseServer();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  return supabase && user ? { supabase, user } : null;
}

const cleanName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, MAX.versionName);

/** The person's name, email and public page (only when it's public under their name), for a new version. */
async function who() {
  const viewer = await getViewer();
  const p = viewer?.profile;
  const host = (await headers()).get('host');
  const link = p?.handle && p.visibility === 'public' && host ? `${host}${routes.portrait(p.handle)}` : null;
  return { name: p?.display_name || '', email: viewer?.user.email ?? null, link };
}

/**
 * A new version: from the confirmed lines of the portrait, a copy of another version, or blank.
 * The first version a person makes is their default.
 */
export async function createVersion(input: { name: string; from: 'portrait' | 'blank' | { copy: string } }): Promise<ActionResult<ResumeVersion>> {
  const session = await signedIn();
  if (!session) return { ok: false, error: NOT_SIGNED_IN };
  const name = cleanName(input.name) || 'Untitled';
  const { supabase, user } = session;
  try {
    const { count } = await supabase.from('resumes').select('id', { count: 'exact', head: true }).eq('owner_id', user.id);
    if ((count ?? 0) >= MAX.versions) return { ok: false, error: `You can keep up to ${MAX.versions} versions. Delete one to make another.` };
    let doc: ResumeDoc;
    let style: ResumeStyle = defaultStyle();
    let target = '';
    let letter: ResumeLetter | undefined;
    if (typeof input.from === 'object') {
      const source = await versionOf(supabase, user.id, input.from.copy);
      if (!source) return { ok: false, error: 'That version isn’t there any more.' };
      doc = source.doc;
      style = source.style;
      target = source.target;
      letter = source.letter;
    } else if (input.from === 'portrait') {
      const { spec } = await loadPortrait(supabase, user.id);
      doc = docFromPortrait(spec, await who());
    } else {
      doc = docFromPortrait(emptySpec(), await who());
    }
    const made = await insertVersion(supabase, user.id, { name, isDefault: (count ?? 0) === 0, target, doc, style, letter });
    return { ok: true, value: made };
  } catch {
    return { ok: false, error: FAILED };
  }
}

/**
 * Save a version. `since` is the updated_at the editor loaded; if the row moved on since (another
 * tab saved), nothing is written and the person is told, so one tab never silently drops the
 * other's work.
 */
export async function saveVersion(input: { id: string; since: string; name: string; target: string; doc: unknown; style: unknown; letter: unknown }): Promise<ActionResult<{ updatedAt: string }>> {
  const session = await signedIn();
  if (!session) return { ok: false, error: NOT_SIGNED_IN };
  const doc = ResumeDoc.safeParse(input.doc);
  const style = ResumeStyle.safeParse(input.style);
  const letter = ResumeLetter.safeParse(input.letter);
  if (!doc.success || !style.success || !letter.success) return { ok: false, error: 'Some of this version is too long to save. Shorten the highlighted field and try again.' };
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: 'Give this version a name.' };
  const updatedAt = new Date().toISOString();
  const { data, error } = await session.supabase
    .from('resumes')
    .update({ name, target: input.target.trim().slice(0, 120), doc: doc.data, style: style.data, letter: letter.data, updated_at: updatedAt })
    .eq('owner_id', session.user.id)
    .eq('id', input.id)
    .eq('updated_at', input.since)
    .select('id');
  if (error) return { ok: false, error: FAILED };
  if (!data?.length) return { ok: false, error: STALE };
  return { ok: true, value: { updatedAt } };
}

export async function makeDefault(id: string): Promise<ActionResult> {
  const session = await signedIn();
  if (!session) return { ok: false, error: NOT_SIGNED_IN };
  const { supabase, user } = session;
  // Clear the old default first: at most one default a person (a unique index holds it).
  const cleared = await supabase.from('resumes').update({ is_default: false }).eq('owner_id', user.id).eq('is_default', true);
  if (cleared.error) return { ok: false, error: FAILED };
  const set = await supabase.from('resumes').update({ is_default: true }).eq('owner_id', user.id).eq('id', id);
  return set.error ? { ok: false, error: FAILED } : { ok: true, value: null };
}

export async function deleteVersion(id: string): Promise<ActionResult> {
  const session = await signedIn();
  if (!session) return { ok: false, error: NOT_SIGNED_IN };
  const { supabase, user } = session;
  const { data, error } = await supabase.from('resumes').delete().eq('owner_id', user.id).eq('id', id).select('is_default');
  if (error) return { ok: false, error: FAILED };
  // Deleting the default hands it to the most recently changed version left.
  if (data?.[0]?.is_default) {
    const { data: next } = await supabase.from('resumes').select('id').eq('owner_id', user.id).order('updated_at', { ascending: false }).limit(1);
    if (next?.[0]) await supabase.from('resumes').update({ is_default: true }).eq('owner_id', user.id).eq('id', next[0].id);
  }
  return { ok: true, value: null };
}
