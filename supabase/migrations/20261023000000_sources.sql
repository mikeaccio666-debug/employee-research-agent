-- Step 3: the agent reads a résumé or a link and drafts the portrait from it.
-- A source is something the person handed the agent: an uploaded résumé (PDF or DOCX, kept in a
-- private storage bucket) or a page they linked (their GitHub profile, their own site). The text
-- read from it is kept beside it, page by page, so every line drawn from it can be checked
-- against its quote later, even after the original page changes.

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('resume', 'website', 'github')),
  -- What the thread shows: the file's name, or the page's title.
  name text not null check (char_length(name) between 1 and 200),
  -- Links only: the address the person gave.
  url text check (char_length(url) <= 2000),
  -- Résumés only: the file in the `sources` bucket, under the owner's folder.
  storage_path text check (char_length(storage_path) <= 400),
  -- The text read from it: [{ "page": 1, "text": "…" }, …]. Never rewritten.
  pages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index sources_owner on public.sources (owner_id, created_at);

alter table public.sources enable row level security;

-- People see and add their own sources and can take them away; nobody edits one.
create policy "sources: owner reads" on public.sources
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "sources: owner adds" on public.sources
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "sources: owner removes" on public.sources
  for delete to authenticated using (owner_id = (select auth.uid()));

revoke all on public.sources from anon, authenticated;
grant select, insert, delete on public.sources to authenticated;

-- The résumé files: private, 10 MB at most, PDF or DOCX only. The browser uploads straight to
-- storage (Vercel functions take 4.5 MB at most), into a folder named after the person's id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sources',
  'sources',
  false,
  10485760,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;

create policy "source files: owner reads" on storage.objects
  for select to authenticated
  using (bucket_id = 'sources' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "source files: owner uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'sources' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "source files: owner removes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'sources' and (storage.foldername(name))[1] = (select auth.uid())::text);
