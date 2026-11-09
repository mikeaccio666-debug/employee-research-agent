import type { Metadata } from 'next';
import { AppShell } from '@/components/shell/AppShell';
import { loadPortrait } from '@/lib/agent/store';
import { exampleSpec } from '@/lib/jobs/example';
import { recommend } from '@/lib/jobs/match';
import { jobSource } from '@/lib/jobs/source';
import { actionsOf, asFeedback, type SavedJob } from '@/lib/jobs/store';
import { talentNav } from '@/lib/nav';
import { routes } from '@/lib/routes';
import { accountFor, getViewer, supabaseServer } from '@/lib/supabase/server';
import { Jobs, type JobCard } from './Jobs';

export const metadata: Metadata = { title: 'Jobs' };

/**
 * Jobs for you (docs/jobs.md, PRD 7.19): postings ranked by what the person confirmed in the
 * studio and what they told the agent they're looking for, each with the reasons it fits. Signed
 * out (previews without Supabase) it shows Lin Zhou's, the example person of the other boards.
 */
export default async function JobsPage() {
  const account = await accountFor(routes.jobs);
  const [viewer, supabase] = account ? await Promise.all([getViewer(), supabaseServer()]) : [null, null];
  const source = jobSource();
  const [spec, saved, jobs] = await Promise.all([
    viewer && supabase ? loadPortrait(supabase, viewer.user.id).then((p) => p.spec) : Promise.resolve(exampleSpec()),
    viewer && supabase ? actionsOf(supabase, viewer.user.id) : Promise.resolve<SavedJob[]>([]),
    // The sample is small enough to rank whole; the read API is asked for what could fit first.
    source.search({ limit: 2000 }),
  ]);
  const recs = recommend(spec, jobs, asFeedback(saved), { now: new Date(), limit: 30 });
  const cards: JobCard[] = recs.items.map(({ job, reasons, caution, action }) => ({
    id: job.id,
    title: job.title,
    company: job.company.name,
    location: job.locations.map((l) => l.as_published).slice(0, 3).join(' · ') || null,
    workplace: job.workplace_type,
    type: job.employment_type.normalized,
    pay: job.salary.find((s) => s.as_published)?.as_published ?? null,
    postedAt: job.posted_at,
    url: job.source.apply_url ?? job.source.posting_url,
    description: job.description.slice(0, 1500),
    reasons,
    caution,
    action,
  }));
  return (
    <AppShell nav={talentNav} active="jobs" footer={account ? undefined : 'Lin Zhou · @lin'} agent={{ context: 'Jobs' }}>
      <Jobs
        cards={cards}
        saved={saved.filter((s) => s.action !== 'dismissed')}
        filteredOut={recs.filteredOut}
        needsPortrait={recs.needsPortrait}
        notice={source.notice}
        signedIn={!!viewer}
        hasRoles={spec.preferences.roles.length > 0}
      />
    </AppShell>
  );
}
