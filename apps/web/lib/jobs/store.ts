import type { SupabaseClient } from '@supabase/supabase-js';
import type { DismissReason, Feedback, JobAction } from './match';
import type { JobPosting } from './types';

// job_actions (supabase/migrations/20261109000000_job_actions.sql), read and written as the
// signed-in person; row-level security keeps it to their own rows.

/** What the saved list needs from a posting, kept as it was when they acted on it. */
export type JobSnapshot = { title: string; company: string; location: string | null; url: string };
export type SavedJob = { jobId: string; action: JobAction; reason: DismissReason | null; job: JobSnapshot; at: string };

export const snapshot = (j: JobPosting): JobSnapshot => ({
  title: j.title.slice(0, 200),
  company: j.company.name.slice(0, 120),
  location: j.locations[0]?.as_published.slice(0, 120) ?? null,
  url: j.source.posting_url,
});

type Row = { job_id: string; action: JobAction; reason: DismissReason | null; job: JobSnapshot; updated_at: string };

/** Their actions, newest first. Empty until the migration runs, so the page still works. */
export async function actionsOf(supabase: SupabaseClient, ownerId: string): Promise<SavedJob[]> {
  const { data, error } = await supabase
    .from('job_actions')
    .select('job_id, action, reason, job, updated_at')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
    .limit(1000)
    .returns<Row[]>();
  if (error) return [];
  return (data ?? []).map((r) => ({ jobId: r.job_id, action: r.action, reason: r.reason, job: r.job, at: r.updated_at }));
}

export const asFeedback = (saved: SavedJob[]): Feedback[] =>
  saved.map((s) => ({ jobId: s.jobId, action: s.action, reason: s.reason, company: s.job.company }));

export async function setAction(
  supabase: SupabaseClient,
  ownerId: string,
  jobId: string,
  action: JobAction,
  reason: DismissReason | null,
  job: JobSnapshot,
) {
  const { error } = await supabase
    .from('job_actions')
    .upsert({ owner_id: ownerId, job_id: jobId, action, reason, job, updated_at: new Date().toISOString() }, { onConflict: 'owner_id,job_id' });
  if (error) throw new Error(error.message);
}

export async function clearAction(supabase: SupabaseClient, ownerId: string, jobId: string) {
  const { error } = await supabase.from('job_actions').delete().eq('owner_id', ownerId).eq('job_id', jobId);
  if (error) throw new Error(error.message);
}
