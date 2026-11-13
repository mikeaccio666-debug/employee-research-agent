'use server';

import { DISMISS_REASONS, type DismissReason, type JobAction } from '@/lib/jobs/match';
import { jobSource } from '@/lib/jobs/source';
import { clearAction, setAction, snapshot } from '@/lib/jobs/store';
import { supabaseServer } from '@/lib/supabase/server';
import type { Result } from '@/lib/account-actions';

// The Jobs page's writes: save a posting, say it isn't for them (and why), note they went to
// apply, or take any of that back. The posting is looked up again here, so what gets stored is the
// source's, never what the browser sent.

const NOT_SIGNED_IN = 'You’re signed out. Sign in again to save.';
const FAILED = 'That didn’t save. Try again in a moment.';

async function signedIn() {
  const supabase = await supabaseServer();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  return supabase && user ? { supabase, user } : null;
}

export async function actOnJob(jobId: string, action: JobAction, reason: DismissReason | null = null): Promise<Result> {
  if (!['saved', 'dismissed', 'applied'].includes(action)) return { ok: false, error: FAILED };
  if (reason !== null && (action !== 'dismissed' || !DISMISS_REASONS.includes(reason))) return { ok: false, error: FAILED };
  const session = await signedIn();
  if (!session) return { ok: false, error: NOT_SIGNED_IN };
  try {
    const job = await jobSource().get(jobId);
    if (!job) return { ok: false, error: 'That posting isn’t there any more.' };
    await setAction(session.supabase, session.user.id, job.id, action, reason, snapshot(job));
  } catch {
    return { ok: false, error: FAILED };
  }
  return { ok: true };
}

export async function undoJobAction(jobId: string): Promise<Result> {
  const session = await signedIn();
  if (!session) return { ok: false, error: NOT_SIGNED_IN };
  try {
    await clearAction(session.supabase, session.user.id, jobId);
  } catch {
    return { ok: false, error: FAILED };
  }
  return { ok: true };
}
