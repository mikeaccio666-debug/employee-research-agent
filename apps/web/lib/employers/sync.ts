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

/** What we hold of a posting, enough to tell whether a listed copy is newer. */
export type StoredJob = { id: string; revision: number; lastVerifiedAt: string };

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
};

/** The tables of supabase/migrations/20261113000000_employers.sql, as the sync needs them. */
export interface EmployerStore {
  /** The employer a board belongs to. On first sight it makes both, linked `auto`. */
  ensureBoard(board: Board, companyName: string): Promise<{ employerId: string; kind: BoardKind }>;
  jobsOnBoard(board: Board): Promise<StoredJob[]>;
  saveJobs(rows: JobRow[]): Promise<void>;
  /** Deletes the postings; rows that cite them go by `on delete cascade`. */
  removeJobs(ids: string[]): Promise<void>;
  boardChecked(board: Board, at: string): Promise<void>;
}

export type SyncResult = {
  saved: number;
  removed: number;
  /** False when some postings missing from the listing were left for the next run. */
  complete: boolean;
};

/** A long location list is cut here so a row stays small; the posting page has the rest. */
const MAX_LOCATIONS = 200;

/** The row for a posting: the record as served, without the description body. */
export function toRow(job: HubJob, employerId: string | null): JobRow {
  const { html: _html, ...description } = job.description;
  return {
    id: job.id,
    revision: job.revision,
    status: job.status,
    source_system: job.source.system,
    tenant: job.source.tenant,
    employer_id: employerId,
    title: job.title.slice(0, 500),
    record: { ...job, description, locations: job.locations.slice(0, MAX_LOCATIONS) },
    first_seen_at: job.first_seen_at,
    last_verified_at: job.last_verified_at,
    closed_at: job.closed_at,
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

/**
 * What a full listing means for what we hold: the listed copies that are new or newer, and the
 * held postings the listing no longer has. A held posting is never replaced by an older revision.
 */
export function planBoardSync(stored: StoredJob[], listing: { jobs: HubJob[]; unread: string[] }): { save: HubJob[]; missing: string[] } {
  const held = new Map(stored.map((s) => [s.id, s]));
  const listed = new Set<string>(listing.unread);
  const save: HubJob[] = [];
  for (const job of listing.jobs) {
    listed.add(job.id);
    const have = held.get(job.id);
    if (!have || job.revision > have.revision || (job.revision === have.revision && Date.parse(job.last_verified_at) > Date.parse(have.lastVerifiedAt))) {
      save.push(job);
    }
  }
  return { save, missing: stored.filter((s) => !listed.has(s.id)).map((s) => s.id) };
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
  const listing = await hub.listBoard(board.system, board.tenant);
  const stored = await store.jobsOnBoard(board);
  if (!listing.jobs.length && !listing.unread.length && !stored.length) return { saved: 0, removed: 0, complete: true };

  const plan = planBoardSync(stored, listing);

  // A held posting the listing no longer has is either removed (410) or was missed by a listing
  // that moved under us. Ask about each one; only an explicit answer deletes it.
  const maxLookups = opts.maxLookups ?? 200;
  const asked = plan.missing.slice(0, maxLookups);
  const remove: string[] = [];
  const save = [...plan.save];
  for (const id of asked) {
    const answer = await hub.getJob(id);
    if (answer.state === 'found') {
      if (answer.job.source.system === board.system && answer.job.source.tenant === board.tenant) save.push(answer.job);
    } else {
      // `removed`: the employer opted out. `unknown`: talent-data-hub no longer has the id, so we
      // can no longer show where the posting came from. Either way it goes.
      remove.push(id);
    }
  }

  if (remove.length) await store.removeJobs(remove);
  if (save.length) {
    const { employerId, kind } = await store.ensureBoard(board, commonName(listing.jobs) ?? commonName(save) ?? board.tenant);
    await store.saveJobs(save.map((job) => toRow(job, kind === 'single' ? employerId : null)));
  }
  const complete = asked.length === plan.missing.length;
  if (complete) await store.boardChecked(board, (opts.now ?? new Date()).toISOString());
  return { saved: save.length, removed: remove.length, complete };
}
