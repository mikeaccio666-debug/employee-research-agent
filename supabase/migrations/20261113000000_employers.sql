-- The employer layer (docs/employers.md, PRD 7.5 CO-09/CO-10). talent-data-hub's public job record
-- has no company entity: a posting carries a company name and the hiring system account it came
-- from, and `company.domain` is always null. So "which company is this" lives here.
--
-- Three tables, written only by server jobs with the service role. Nothing in the app reads them
-- yet, so there are no policies for signed-in people: row-level security is on and every request
-- made with a person's session sees nothing.

-- A company as people know it. Built before the company joins; `state` moves to `claimed` only when
-- a person on our side approves a claim, and to `hidden` when a takedown request is upheld (ADM-07).
create table public.employers (
  id uuid primary key default gen_random_uuid(),
  -- The page address, /c/<slug>.
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  name text not null check (char_length(name) between 1 and 300),
  -- A lead from a public registry or a careers-site host. Never proof of who the company is.
  domain_hint text check (domain_hint is null or domain_hint ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  -- Written only when a reviewer approves a claim (ACC-05). Hiding a job seeker from their current
  -- employer (PRIV-07) may rely on this one, not on the hint.
  verified_domain text check (verified_domain is null or verified_domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  state text not null default 'unclaimed' check (state in ('unclaimed', 'claimed', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (verified_domain is null or state = 'claimed')
);

create trigger employers_touch before update on public.employers
  for each row execute function public.touch_updated_at();

-- One account on one hiring system, e.g. greenhouse + acmeanalytics, and the employer it belongs to.
create table public.employer_boards (
  source_system text not null check (source_system ~ '^[a-z][a-z0-9_]*$'),
  tenant text not null check (char_length(tenant) between 1 and 200),
  employer_id uuid not null references public.employers (id) on delete cascade,
  -- `auto`: made when the board was first read, one board to one employer. `reviewed`: a person
  -- confirmed or corrected it. A sync never overwrites a reviewed link.
  linked_by text not null default 'auto' check (linked_by in ('auto', 'reviewed')),
  -- A staffing agency's board, or one board carrying several brands, is not one employer's hiring.
  -- Its postings are kept but not counted as the linked employer's until a person sorts them out.
  kind text not null default 'single' check (kind in ('single', 'multi_brand', 'staffing')),
  -- The last time a full listing of this board was read without an error.
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (source_system, tenant)
);

create index employer_boards_employer on public.employer_boards (employer_id);

-- The postings we keep: only those of boards we follow. Not a copy of talent-data-hub; broad search
-- goes to its search service. `record` is its JobRecord v1 as served, without the description body.
-- When talent-data-hub removes a posting we delete the row; tables that later cite a posting must
-- reference this one with `on delete cascade` so what was derived from it goes too.
create table public.jobs (
  -- talent-data-hub's job id.
  id uuid primary key,
  revision integer not null check (revision >= 1),
  status text not null check (status in ('open', 'closed')),
  source_system text not null,
  tenant text not null,
  employer_id uuid references public.employers (id) on delete set null,
  title text not null check (char_length(title) between 1 and 500),
  record jsonb not null check (pg_column_size(record) <= 16000),
  first_seen_at timestamptz not null,
  -- When talent-data-hub last saw it open at its source. Pages show this date.
  last_verified_at timestamptz not null,
  closed_at timestamptz,
  -- When we last saved it, or confirmed by id that talent-data-hub still has it.
  fetched_at timestamptz not null default now(),
  foreign key (source_system, tenant) references public.employer_boards (source_system, tenant) on delete cascade
);

create index jobs_board on public.jobs (source_system, tenant);
create index jobs_employer on public.jobs (employer_id, status);

-- Whose a posting is follows its board. When a person corrects a board's employer, or marks the
-- board as a staffing agency's or as carrying several brands, every posting already held moves with
-- it, whether or not talent-data-hub has changed the posting since.
create function public.employer_board_owns_jobs() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.jobs
     set employer_id = case when new.kind = 'single' then new.employer_id end
   where source_system = new.source_system
     and tenant = new.tenant
     and employer_id is distinct from (case when new.kind = 'single' then new.employer_id end);
  return null;
end;
$$;

create trigger employer_boards_own_jobs after update of employer_id, kind on public.employer_boards
  for each row execute function public.employer_board_owns_jobs();

revoke all on function public.employer_board_owns_jobs() from public, anon, authenticated;

alter table public.employers enable row level security;
alter table public.employer_boards enable row level security;
alter table public.jobs enable row level security;

revoke all on public.employers, public.employer_boards, public.jobs from anon, authenticated;
