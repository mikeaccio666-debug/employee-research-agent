-- What a person did with a recommended job (docs/jobs.md, PRD JOB-03/04): saved it, said it's not
-- for them (and why), or went to apply. One row per person and posting; a later action replaces an
-- earlier one. The recommendations read it back: dismissed postings stay hidden, "not this company"
-- hides the company, and the reasons will tune ranking. `job` keeps the posting's title, company and
-- link as they were, so the saved list still reads after the posting closes or the job source changes.

create table public.job_actions (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  -- talent-data-hub's job id, or `sample:<system>:<tenant>:<id>` for the sample catalog.
  job_id text not null check (char_length(job_id) between 1 and 200),
  action text not null check (action in ('saved', 'dismissed', 'applied')),
  reason text check (reason in ('role', 'seniority', 'location', 'company', 'pay', 'other')),
  job jsonb not null default '{}'::jsonb check (pg_column_size(job) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, job_id),
  check (reason is null or action = 'dismissed')
);

create index job_actions_recent on public.job_actions (owner_id, updated_at desc);

alter table public.job_actions enable row level security;

create policy "job_actions: owner reads" on public.job_actions
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "job_actions: owner adds" on public.job_actions
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "job_actions: owner updates" on public.job_actions
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "job_actions: owner removes" on public.job_actions
  for delete to authenticated using (owner_id = (select auth.uid()));

revoke all on public.job_actions from anon, authenticated;
grant select, insert, update, delete on public.job_actions to authenticated;
