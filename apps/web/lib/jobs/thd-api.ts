import { z } from 'zod';

// talent-data-hub's read API v1 as its code serves it (apps/api in edaix-official/talent-data-hub,
// read at commit d5c1aa0). What matters to a caller:
//
// - Every request carries `Authorization: Bearer <key>`. Only Mike issues keys.
// - `GET /v1/jobs` answers `{ data, next_cursor }`, at most 200 a page. It filters by status,
//   source, tenant, exact company name and one country. It has no keyword search.
// - A job can repeat on a later page when it changed while we were reading. Removed jobs are not
//   listed at all.
// - `GET /v1/jobs/:id` answers 410 for a removed job: the employer opted out or asked for removal,
//   and every copy must be deleted. 404 means it never knew the id.
// - Errors are `{ error: { code, message } }`.

const Stamp = z.string().min(1);

/** JobRecord v1, the fields we keep. Open sets stay strings; fields we don't name pass through. */
export const HubJob = z.looseObject({
  id: z.uuid(),
  revision: z.number().int().positive(),
  status: z.enum(['open', 'closed']),
  source: z.looseObject({
    system: z.string().min(1),
    tenant: z.string().min(1),
    external_id: z.string().min(1),
    posting_url: z.string().min(1),
    apply_url: z.string().nullable(),
  }),
  title: z.string().min(1),
  company: z.looseObject({ name: z.string().min(1), domain: z.string().nullable() }),
  locations: z.array(
    z.looseObject({ as_published: z.string(), country: z.string().nullable(), region: z.string().nullable(), city: z.string().nullable() }),
  ),
  workplace_type: z.string(),
  employment_type: z.looseObject({ as_published: z.string().nullable(), normalized: z.string() }),
  posted_at: z.string().nullable(),
  salary: z.array(
    z.looseObject({
      as_published: z.string().nullable(),
      min: z.number().nullable(),
      max: z.number().nullable(),
      currency: z.string().nullable(),
      period: z.string().nullable(),
    }),
  ),
  description: z.looseObject({ html: z.string().optional() }),
  first_seen_at: Stamp,
  last_verified_at: Stamp,
  closed_at: Stamp.nullable(),
});
export type HubJob = z.infer<typeof HubJob>;

const Page = z.object({ data: z.array(z.unknown()), next_cursor: z.string().nullable() });

/** The API answered something other than what we asked for. Nothing may be concluded from it. */
export class HubError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HubError';
  }
}

export type BoardListing = {
  /** Every job of the board, open and closed, each once at its highest revision. */
  jobs: HubJob[];
  /** Ids of listed records we could not read. They exist, so they must not be treated as gone. */
  unread: string[];
};

export type HubLookup = { state: 'found'; job: HubJob } | { state: 'removed' } | { state: 'unknown' };

export interface HubApi {
  /** One hiring system account, read to the last page. Throws rather than return part of it. */
  listBoard(system: string, tenant: string): Promise<BoardListing>;
  getJob(id: string): Promise<HubLookup>;
}

/** The newer of two copies of one job: higher revision, then later verification. */
export function newer(a: HubJob, b: HubJob): HubJob {
  if (a.revision !== b.revision) return a.revision > b.revision ? a : b;
  return Date.parse(b.last_verified_at) > Date.parse(a.last_verified_at) ? b : a;
}

export function hubApi(baseUrl: string, key: string, opts: { fetch?: typeof fetch; maxPages?: number } = {}): HubApi {
  const send = opts.fetch ?? fetch;
  const maxPages = opts.maxPages ?? 500;

  const call = async (path: string) => {
    const res = await send(new URL(path, baseUrl), {
      headers: { authorization: `Bearer ${key}`, accept: 'application/json' },
      cache: 'no-store',
    });
    return res;
  };

  return {
    async listBoard(system, tenant) {
      const byId = new Map<string, HubJob>();
      const unread = new Set<string>();
      let cursor: string | null = null;
      for (let pages = 0; ; pages++) {
        if (pages >= maxPages) throw new HubError(0, `listing ${system}/${tenant} did not end within ${maxPages} pages`);
        const params = new URLSearchParams({ source: system, tenant, limit: '200' });
        if (cursor) params.set('cursor', cursor);
        const res = await call(`/v1/jobs?${params}`);
        if (!res.ok) throw new HubError(res.status, `talent-data-hub answered ${res.status} listing ${system}/${tenant}`);
        const page = Page.safeParse(await res.json());
        if (!page.success) throw new HubError(res.status, `talent-data-hub sent a page we cannot read for ${system}/${tenant}`);
        for (const raw of page.data.data) {
          const job = HubJob.safeParse(raw);
          if (job.success) {
            const seen = byId.get(job.data.id);
            byId.set(job.data.id, seen ? newer(seen, job.data) : job.data);
          } else {
            const id = (raw as { id?: unknown } | null)?.id;
            if (typeof id !== 'string') throw new HubError(res.status, `talent-data-hub listed a record without an id for ${system}/${tenant}`);
            unread.add(id);
          }
        }
        cursor = page.data.next_cursor;
        if (cursor === null) break;
      }
      for (const id of byId.keys()) unread.delete(id);
      return { jobs: [...byId.values()], unread: [...unread] };
    },

    async getJob(id) {
      const res = await call(`/v1/jobs/${encodeURIComponent(id)}`);
      if (res.status === 410) return { state: 'removed' };
      if (res.status === 404) return { state: 'unknown' };
      if (!res.ok) throw new HubError(res.status, `talent-data-hub answered ${res.status} for job ${id}`);
      const job = HubJob.safeParse(await res.json());
      if (!job.success) throw new HubError(res.status, `talent-data-hub sent a job we cannot read: ${id}`);
      return { state: 'found', job: job.data };
    },
  };
}
