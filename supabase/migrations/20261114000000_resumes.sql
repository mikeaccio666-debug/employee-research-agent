-- Résumé versions from the résumé editor (PRD COACH-12): a traditional,
-- one-page résumé the person edits themselves, with the AI beside it. One row per version ("Default",
-- "Data analyst"); `doc` is the page (lib/resume/doc.ts ResumeDoc), `style` how it is set (template,
-- font, size, alignment, fit to one page), `letter` the cover letter that goes with it. At most one
-- version per person is the default. Only the owner can see or change their versions.

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  is_default boolean not null default false,
  -- The role this version is for, as the person put it ("Data analyst at fintechs"); may be empty.
  target text not null default '' check (char_length(target) <= 120),
  doc jsonb not null default '{}'::jsonb check (pg_column_size(doc) <= 200000),
  style jsonb not null default '{}'::jsonb check (pg_column_size(style) <= 2000),
  letter jsonb not null default '{}'::jsonb check (pg_column_size(letter) <= 40000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index resumes_owner on public.resumes (owner_id, updated_at desc);
create unique index resumes_one_default on public.resumes (owner_id) where is_default;

-- At most 20 versions a person. Counted in a security-definer function so the check doesn't
-- recurse through this table's own row-level security.
create function public.resume_count(owner uuid) returns integer
  language sql stable security definer set search_path = '' as $$
    select count(*)::integer from public.resumes where owner_id = owner
  $$;
revoke all on function public.resume_count(uuid) from public;
grant execute on function public.resume_count(uuid) to authenticated;

alter table public.resumes enable row level security;

create policy "resumes: owner reads" on public.resumes
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "resumes: owner adds" on public.resumes
  for insert to authenticated with check (owner_id = (select auth.uid()) and public.resume_count((select auth.uid())) < 20);
create policy "resumes: owner updates" on public.resumes
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "resumes: owner removes" on public.resumes
  for delete to authenticated using (owner_id = (select auth.uid()));

revoke all on public.resumes from anon, authenticated;
grant select, insert, update, delete on public.resumes to authenticated;
