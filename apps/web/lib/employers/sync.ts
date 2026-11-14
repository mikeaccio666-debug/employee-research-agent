import type { HubApi, HubJob } from '@/lib/jobs/thd-api';

// Keeping one company's postings current (docs/employers.md). We follow hiring system accounts
// ("boards"), not talent-data-hub's whole event stream: a board is listed in full, and what we hold
// is compared with the listing.
//
// Two rules decide every case:
// - An incomplete read proves nothing. If the listing fails or is cut short, nothing changes.
// - A posting talent-data-hub removed must be deleted here, with everything derived from it. A
//   posting that is merely closed stays, as closed: the history is what a dossier reads.

export type Board = { system: string; tenant: string };
export type BoardKind = 'single' | 'multi_brand' | 'staffing';

/** What we hold of a posting, enough to tell whether another copy is newer. */
export type StoredJob = {
  id: string;
  revision: number;
  lastVerifiedAt: string;
  /** When we last saved it, or confirmed by id that it still exists. */
  fetchedAt: string;
};

/** A row of `public.jobs`. */
export type JobRow = {
  id: string;
  revision: number;
  status: 'open' | 'closed';
  source_system: string;
  tenant: string;
  employer_id: string | null;
  title: string;
  record: Record<string, unknown>;
  first_seen_at: string;
  last_verified_at: string;
  closed_at: string | null;
  fetched_at: string;
};

/** The tables of supabase/migrations/20261113000000_employers.sql, as the sync needs them. */
export interface EmployerStore {
  /** The employer a board belongs to. On first sight it makes both, linked `auto`. */
  ensureBoard(board: Board, companyName: string): Promise<{ employerId: string; kind: BoardKind }>;
  jobsOnBoard(board: Board): Promise<StoredJob[]>;
  saveJobs(rows: JobRow[]): Promise<void>;
  /** Sets `fetched_at` on postings that were confirmed by id and did not change. */
  touchJobs(ids: string[], at: string): Promise<void>;
  /** Deletes the postings; rows that cite them go by `on delete cascade`. */
  removeJobs(ids: string[]): Promise<void>;
  boardChecked(board: Board, at: string): Promise<void>;
}

export type SyncResult = {
  saved: number;
  removed: number;
  /** Postings that could not be stored. They are listed, so they are not taken for gone. */
  skipped: number;
  /** False when some postings missing from the listing were left for the next run. */
  complete: boolean;
};

/**
 * How large a stored record may be, as JSON text. The column allows 16,000 bytes of jsonb
 * (`pg_column_size`), and jsonb can run a fifth larger than its text.
 */
export const RECORD_BUDGET = 12_000;

const size = (value: unknown) => Buffer.byteLength(JSON.stringify(value));

/** The text cut to at most this many bytes. */
function fit(text: string, bytes: number): string {
  let out = text.slice(0, bytes);
  while (Buffer.byteLength(out) > bytes) out = out.slice(0, Math.floor(out.length * 0.9));
  return out;
}
const fitOrNull = (text: string | null, bytes: number) => (text === null ? null : fit(text, bytes));

/** A link longer than this is not cut, because a cut link points nowhere. */
const MAX_URL = 2000;

/**
 * The record as served, without the description body, made to fit the column whatever the posting
 * holds: first with fewer locations, then with only the fields we read and long texts cut. A record
 * that lost something says so in `truncated`. Null when even the link to the posting is too long to
 * keep whole; such a posting is not stored.
 */
export function storedRecord(job: HubJob): Record<string, unknown> | null {
  if (Buffer.byteLength(job.source.posting_url) > MAX_URL) return null;
  const { html: _html, ...description } = job.description;
  const full: Record<string, unknown> = { ...job, description };
  if (size(full) <= RECORD_BUDGET) return full;

  for (let keep = Math.min(job.locations.length, 200); keep >= 1; keep = Math.floor(keep / 2)) {
    const fewer = { ...full, locations: job.locations.slice(0, keep), truncated: ['locations'] };
    if (size(fewer) <= RECORD_BUDGET) return fewer;
  }

  const applyUrl = job.source.apply_url !== null && Buffer.byteLength(job.source.apply_url) <= MAX_URL ? job.source.apply_url : null;
  return {
    id: job.id,
    revision: job.revision,
    status: job.status,
    source: {
      system: fit(job.source.system, 100),
      tenant: fit(job.source.tenant, 200),
      external_id: fit(job.source.external_id, 200),
      posting_url: job.source.posting_url,
      apply_url: applyUrl,
    },
    title: fit(job.title, 600),
    company: { name: fit(job.company.name, 400), domain: fitOrNull(job.company.domain, 255) },
    locations: job.locations.slice(0, 3).map((l) => ({
      as_published: fit(l.as_published, 200),
      country: fitOrNull(l.country, 10),
      region: fitOrNull(l.region, 80),
      city: fitOrNull(l.city, 80),
    })),
    workplace_type: fit(job.workplace_type, 50),
    employment_type: { as_published: fitOrNull(job.employment_type.as_published, 200), normalized: fit(job.employment_type.normalized, 50) },
    posted_at: fitOrNull(job.posted_at, 40),
    salary: job.salary.slice(0, 3).map((s) => ({
      as_published: fitOrNull(s.as_published, 200),
      min: s.min,
      max: s.max,
      currency: fitOrNull(s.currency, 10),
      period: fitOrNull(s.period, 20),
    })),
    description: {},
    first_seen_at: fit(job.first_seen_at, 40),
    last_verified_at: fit(job.last_verified_at, 40),
    closed_at: fitOrNull(job.closed_at, 40),
    truncated: ['locations', 'salary', 'texts', 'other fields'],
  };
}

/** The row for a posting, or null when it cannot be stored (see `storedRecord`). */
export function toRow(job: HubJob, employerId: string | null, at: string): JobRow | null {
  const record = storedRecord(job);
  if (!record) return null;
  return {
    id: job.id,
    revision: job.revision,
    status: job.status,
    source_system: job.source.system,
    tenant: job.source.tenant,
    employer_id: employerId,
    title: job.title.slice(0, 500),
    record,
    first_seen_at: job.first_seen_at,
    last_verified_at: job.last_verified_at,
    closed_at: job.closed_at,
    fetched_at: at,
  };
}

/** The name most postings of a board carry. */
export function commonName(jobs: HubJob[]): string | null {
  const count = new Map<string, number>();
  for (const j of jobs) count.set(j.company.name, (count.get(j.company.name) ?? 0) + 1);
  let best: string | null = null;
  for (const [name, n] of count) if (best === null || n > count.get(best)!) best = name;
  return best;
}

/** Whether a copy from talent-data-hub is newer than the one we hold. Never true for an older revision. */
export function isNewer(job: HubJob, have: Pick<StoredJob, 'revision' | 'lastVerifiedAt'>): boolean {
  return job.revision > have.revision || (job.revision === have.revision && Date.parse(job.last_verified_at) > Date.parse(have.lastVerifiedAt));
}

/**
 * What a full listing means for what we hold: the listed copies that are new or newer, and the
 * held postings the listing no longer has, the ones we have gone longest without hearing of first.
 */
export function planBoardSync(stored: StoredJob[], listing: { jobs: HubJob[]; unread: string[] }): { save: HubJob[]; missing: string[] } {
  const held = new Map(stored.map((s) => [s.id, s]));
  const listed = new Set<string>(listing.unread);
  const save: HubJob[] = [];
  for (const job of listing.jobs) {
    listed.add(job.id);
    const have = held.get(job.id);
    if (!have || isNewer(job, have)) save.push(job);
  }
  const missing = stored
    .filter((s) => !listed.has(s.id))
    .sort((a, b) => Date.parse(a.fetchedAt) - Date.parse(b.fetchedAt) || a.id.localeCompare(b.id))
    .map((s) => s.id);
  return { save, missing };
}

/**
 * Reads one board and brings our rows in line with it. Throws `HubError` when talent-data-hub
 * could not be read; in that case nothing was written.
 */
export async function syncBoard(
  store: EmployerStore,
  hub: HubApi,
  board: Board,
  opts: { now?: Date; maxLookups?: number } = {},
): Promise<SyncResult> {
  const at = (opts.now ?? new Date()).toISOString();
  const listing = await hub.listBoard(board.system, board.tenant);
  const stored = await store.jobsOnBoard(board);
  if (!listing.jobs.length && !listing.unread.length && !stored.length) return { saved: 0, removed: 0, skipped: 0, complete: true };

  const held = new Map(stored.map((s) => [s.id, s]));
  const plan = planBoardSync(stored, listing);

  // A held posting the listing no longer has is either removed (410) or was missed by a listing
  // that moved under us. Ask about each one; only an explicit answer deletes it. A run asks about a
  // bounded number. Each one asked about is saved, touched or deleted, so the next run starts with
  // the others.
  const maxLookups = opts.maxLookups ?? 200;
  const asked = plan.missing.slice(0, maxLookups);
  const remove: string[] = [];
  const touch: string[] = [];
  const save = [...plan.save];
  for (const id of asked) {
    const answer = await hub.getJob(id);
    if (answer.state === 'found') {
      const onBoard = answer.job.source.system === board.system && answer.job.source.tenant === board.tenant;
      if (onBoard && isNewer(answer.job, held.get(id)!)) save.push(answer.job);
      else touch.push(id);
    } else {
      // `removed`: the employer opted out. `unknown`: talent-data-hub no longer has the id, so we
      // can no longer show where the posting came from. Either way it goes.
      remove.push(id);
    }
  }

  if (remove.length) await store.removeJobs(remove);
  if (touch.length) await store.touchJobs(touch, at);
  let saved = 0;
  if (save.length) {
    const { employerId, kind } = await store.ensureBoard(board, commonName(listing.jobs) ?? commonName(save) ?? board.tenant);
    const rows = save.map((job) => toRow(job, kind === 'single' ? employerId : null, at)).filter((row) => row !== null);
    if (rows.length) await store.saveJobs(rows);
    saved = rows.length;
  }
  const complete = asked.length === plan.missing.length;
  if (complete) await store.boardChecked(board, at);
  return { saved, removed: remove.length, skipped: save.length - saved, complete };
}
