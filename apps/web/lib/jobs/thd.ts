import type { EmploymentType, JobPosting, JobSalary, WorkplaceType } from './types';
import { EMPLOYMENT_TYPES, WORKPLACE_TYPES } from './types';

// talent-data-hub's JobRecord v1, the fields we read. The contract allows new values in its open
// sets (workplace, employment, pay period), so anything we don't know reads as `unknown`.
export type JobRecordV1 = {
  id: string;
  status: 'open' | 'closed';
  source: { system: string; tenant: string; external_id: string; posting_url: string; apply_url: string | null };
  title: string;
  company: { name: string; domain: string | null };
  locations: { as_published: string; country: string | null; region: string | null; city: string | null }[];
  workplace_type: string;
  employment_type: { as_published: string | null; normalized: string };
  posted_at: string | null;
  salary: { as_published: string | null; min: number | null; max: number | null; currency: string | null; period: string | null }[];
  description: { html?: string };
  last_verified_at: string;
};

const PERIODS = ['hour', 'day', 'week', 'month', 'year'] as const;

/** HTML to the plain text matching and quotes read. */
export function plainText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|ul|ol)>|<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function fromJobRecord(r: JobRecordV1): JobPosting {
  const known = <T extends string>(set: readonly T[], v: string, fallback: T): T => ((set as readonly string[]).includes(v) ? (v as T) : fallback);
  return {
    id: r.id,
    title: r.title,
    company: r.company,
    locations: r.locations,
    workplace_type: known<WorkplaceType>(WORKPLACE_TYPES, r.workplace_type, 'unknown'),
    employment_type: { as_published: r.employment_type.as_published, normalized: known<EmploymentType>(EMPLOYMENT_TYPES, r.employment_type.normalized, 'unknown') },
    posted_at: r.posted_at,
    salary: r.salary.map((s): JobSalary => ({ ...s, period: (PERIODS as readonly string[]).includes(s.period ?? '') ? (s.period as JobSalary['period']) : null })),
    description: plainText(r.description.html ?? ''),
    source: { system: r.source.system, tenant: r.source.tenant, posting_url: r.source.posting_url, apply_url: r.source.apply_url },
    last_verified_at: r.last_verified_at,
  };
}
