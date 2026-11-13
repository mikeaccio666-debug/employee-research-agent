'use server';

import { agentEnv, summarizerFor } from '@/lib/agent/env';
import { anthropicAdapter } from '@/lib/agent/providers/anthropic';
import { openaiAdapter } from '@/lib/agent/providers/openai';
import { conversationFor, loadPortrait, logCall } from '@/lib/agent/store';
import { checkFit, type Fit } from '@/lib/jobs/fit';
import { DISMISS_REASONS, type DismissReason, type JobAction } from '@/lib/jobs/match';
import { reportError } from '@/lib/observability/report';
import { jobSource } from '@/lib/jobs/source';
import { clearAction, setAction, snapshot } from '@/lib/jobs/store';
import { supabaseServer } from '@/lib/supabase/server';
import type { Result } from '@/lib/account-actions';

// The Jobs page's writes: save a posting, say it isn't for them (and why), note they went to
// apply, or take any of that back. The posting is looked up again here, so what gets stored is the
// source's, never what the browser sent.

const NOT_SIGNED_IN = 'You’re signed out. Sign in again to save.';
const FAILED = 'That didn’t save. Try again in a moment.';
const FIT_FAILED = 'The check didn’t finish. Try again in a moment.';

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

/** Fit checks one person may run in a day (JOB_FIT_DAILY): each is one call to the small model. */
const FIT_DAILY = Number(process.env.JOB_FIT_DAILY || 60);
const FIT_STOP = 'job_fit';

/**
 * What one posting asks for against the person's confirmed lines (lib/jobs/fit.ts). One call to
 * the provider's small model, logged with the studio conversation's other calls. Nothing is stored:
 * the portrait and the posting both change, so the check is made fresh each time it is asked for.
 */
export async function checkJobFit(jobId: string): Promise<Result<{ fit: Fit }>> {
  const session = await signedIn();
  if (!session) return { ok: false, error: 'You’re signed out. Sign in again to check your fit.' };
  if (!agentEnv) return { ok: false, error: 'The fit check isn’t set up here yet.' };
  const { supabase, user } = session;
  const env = summarizerFor(agentEnv);
  const began = Date.now();
  let conversationId: string | null = null;
  // Whether the model's answer is already in the log: a check is logged, and counted, once.
  let logged = false;
  try {
    const [job, portrait] = await Promise.all([jobSource().get(jobId), loadPortrait(supabase, user.id)]);
    if (!job) return { ok: false, error: 'That posting isn’t there any more.' };
    conversationId = await conversationFor(supabase, user.id, true);
    if (!conversationId) return { ok: false, error: FIT_FAILED };
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await supabase
      .from('model_calls')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .like('stop_reason', `${FIT_STOP}:%`)
      .gte('created_at', since);
    if ((count ?? 0) >= FIT_DAILY) return { ok: false, error: 'That’s all the fit checks for today. They come back tomorrow.' };

    const adapter = env.provider === 'anthropic' ? anthropicAdapter(env) : openaiAdapter(env);
    const id = conversationId;
    const fit = await checkFit(job, portrait.spec, async (instructions, text) => {
      const { text: out, log } = await adapter.summarize(instructions, text, AbortSignal.timeout(40_000));
      // Marked as a fit check in stop_reason, which is how the day's checks are counted.
      await logCall(supabase, id, { provider: env.provider, ...log, stop_reason: `${FIT_STOP}:${log.stop_reason}`, latency_ms: Date.now() - began, error: null });
      logged = true;
      return out;
    });
    return { ok: true, fit };
  } catch (e) {
    reportError('job fit check failed', e, { jobId });
    // A call that never got an answer is logged for us but doesn't use up one of the day's checks.
    if (conversationId && !logged) {
      await logCall(supabase, conversationId, {
        provider: env.provider,
        model: env.model,
        latency_ms: Date.now() - began,
        stop_reason: `${FIT_STOP}_failed`,
        error: e instanceof Error ? e.message.slice(0, 300) : 'failed',
      });
    }
    return { ok: false, error: FIT_FAILED };
  }
}
