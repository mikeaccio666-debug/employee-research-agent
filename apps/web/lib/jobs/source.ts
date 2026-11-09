import type { JobPosting, JobQuery } from './types';
import { fromJobRecord, type JobRecordV1 } from './thd';

// Where the Jobs page gets postings (docs/jobs.md). Two sources behind one interface:
//
// - `thd`: talent-data-hub's read API, once it is live. Set THD_API_URL and THD_API_KEY.
// - `sample`: postings talent-data-hub already recorded from employers' own job boards in early
//   November 2026 (lib/jobs/sample-jobs.json, built by scripts/jobs-sample.mjs). Some may have
//   closed since, so the page says it is a sample.
//
// JOBS_SOURCE picks one; without it, `thd` when its URL is set, else `sample`.

export interface JobSource {
  name: 'sample' | 'thd';
  /** A line the page shows about where the postings come from, or null when they are live. */
  notice: string | null;
  search(query: JobQuery): Promise<JobPosting[]>;
  get(id: string): Promise<JobPosting | null>;
}

let sampleJobs: Promise<JobPosting[]> | null = null;
function loadSample(): Promise<JobPosting[]> {
  sampleJobs ??= import('./sample-jobs.json').then((m) => (m.default as { jobs: JobPosting[] }).jobs);
  return sampleJobs;
}

const sample: JobSource = {
  name: 'sample',
  notice: 'A sample of 1,224 real postings read from 9 employers’ job boards on 5–8 November 2026. Some may have closed since.',
  async search(query) {
    return filterJobs(await loadSample(), query);
  },
  async get(id) {
    return (await loadSample()).find((j) => j.id === id) ?? null;
  },
};

/** The same narrowing the read API does, for the sample. */
export function filterJobs(jobs: JobPosting[], q: JobQuery): JobPosting[] {
  const words = (q.keywords ?? []).map((w) => w.toLowerCase()).filter(Boolean);
  const out = jobs.filter(
    (j) =>
      (!q.countries?.length || j.locations.some((l) => l.country && q.countries!.includes(l.country)) || j.workplace_type === 'remote') &&
      (!q.workplaceTypes?.length || q.workplaceTypes.includes(j.workplace_type) || j.workplace_type === 'unknown') &&
      (!q.employmentTypes?.length || q.employmentTypes.includes(j.employment_type.normalized) || j.employment_type.normalized === 'unknown') &&
      (!words.length || words.some((w) => `${j.title}\n${j.description}`.toLowerCase().includes(w))),
  );
  return q.limit ? out.slice(0, q.limit) : out;
}

function thd(url: string, key: string): JobSource {
  const call = async (path: string) => {
    const res = await fetch(new URL(path, url), {
      headers: { authorization: `Bearer ${key}`, accept: 'application/json' },
      next: { revalidate: 900 },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`talent-data-hub answered ${res.status}`);
    return res.json() as Promise<unknown>;
  };
  return {
    name: 'thd',
    notice: null,
    async search(q) {
      const params = new URLSearchParams({ status: 'open', include: 'description', limit: String(q.limit ?? 500) });
      if (q.keywords?.length) params.set('q', q.keywords.join(' OR '));
      for (const c of q.countries ?? []) params.append('country', c);
      for (const w of q.workplaceTypes ?? []) params.append('workplace_type', w);
      for (const e of q.employmentTypes ?? []) params.append('employment_type', e);
      const body = (await call(`/v1/jobs?${params}`)) as { jobs?: JobRecordV1[] } | null;
      return (body?.jobs ?? []).map(fromJobRecord);
    },
    async get(id) {
      const body = (await call(`/v1/jobs/${encodeURIComponent(id)}?include=description`)) as JobRecordV1 | null;
      return body ? fromJobRecord(body) : null;
    },
  };
}

export function jobSource(): JobSource {
  const url = process.env.THD_API_URL;
  const key = process.env.THD_API_KEY;
  const want = process.env.JOBS_SOURCE ?? (url ? 'thd' : 'sample');
  if (want === 'thd' && url && key) return thd(url, key);
  return sample;
}
