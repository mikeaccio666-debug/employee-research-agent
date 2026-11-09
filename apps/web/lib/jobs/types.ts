// A job posting as the Jobs page reads it: the consumer view of talent-data-hub's public job
// record, JobRecord v1 (edaix-official/talent-data-hub, packages/contracts/src/job-record.ts).
// Field names follow that contract so the two stay easy to compare. What we leave out: revision,
// content digests and evidence (we don't replay), and the description's HTML, which we keep as
// plain text because matching and the quotes in a reason read text.

export const WORKPLACE_TYPES = ['on_site', 'hybrid', 'remote', 'unknown'] as const;
export type WorkplaceType = (typeof WORKPLACE_TYPES)[number];

export const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'temporary', 'internship', 'volunteer', 'unknown'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export type JobLocation = {
  as_published: string;
  /** ISO 3166-1 alpha-2, when it could be read. */
  country: string | null;
  region: string | null;
  city: string | null;
};

/** Pay as the employer published it. Never estimated. */
export type JobSalary = {
  as_published: string | null;
  min: number | null;
  max: number | null;
  currency: string | null;
  period: 'hour' | 'day' | 'week' | 'month' | 'year' | null;
};

export type JobPosting = {
  /** talent-data-hub's stable id; `sample:<system>:<tenant>:<external id>` in the sample. */
  id: string;
  title: string;
  company: { name: string; domain: string | null };
  locations: JobLocation[];
  workplace_type: WorkplaceType;
  employment_type: { as_published: string | null; normalized: EmploymentType };
  /** When the employer published it (an instant or a day); never when we first saw it. */
  posted_at: string | null;
  salary: JobSalary[];
  /** The employer's description as plain text, possibly cut short. */
  description: string;
  source: { system: string; tenant: string; posting_url: string; apply_url: string | null };
  /** When the platform last saw it open at its source. */
  last_verified_at: string;
};

/** What a page or the agent asks the job source for. Every field narrows; none is required. */
export type JobQuery = {
  /** Words to look for in the title and description. */
  keywords?: string[];
  countries?: string[];
  workplaceTypes?: WorkplaceType[];
  employmentTypes?: EmploymentType[];
  limit?: number;
};
