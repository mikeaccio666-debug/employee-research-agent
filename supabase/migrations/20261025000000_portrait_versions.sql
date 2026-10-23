-- Step 4: version history for the portrait (PRD STU-10, STU-07).
-- Every change to what the page would show (a new rev in portraits.spec) keeps a copy of the
-- spec as it became, newest 50 per person. The studio lists them, says what each one changed,
-- and can undo any single change or go back to a version. The copies are written by a trigger,
-- so the agent's saves and the person's own edits are both recorded without either asking.

create table public.portrait_versions (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  rev integer not null,
  -- The whole spec after the change, drafts and evidence included: it never leaves the owner.
  spec jsonb not null,
  -- agent: the studio agent's tools. person: the person's own answers and edits. undo: a change
  -- undone or a version brought back.
  made_by text not null check (made_by in ('agent', 'person', 'undo')),
  created_at timestamptz not null default now()
);

create index portrait_versions_owner on public.portrait_versions (owner_id, id desc);

alter table public.portrait_versions enable row level security;

create policy "portrait versions: read own" on public.portrait_versions
  for select to authenticated using ((select auth.uid()) = owner_id);

-- Read-only from the browser: only the trigger below writes, and nothing is edited.
revoke insert, update, delete on public.portrait_versions from authenticated, anon;

-- Who made a change rides in on the saved spec as "_by" (lib/portrait-actions.ts sets it; the
-- agent's saves never carry it). The trigger takes it off before the row is stored, so the
-- spec itself stays clean, and records a version whenever the rev moved.
create function public.record_portrait_version() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  by_whom text := coalesce(new.spec ->> '_by', 'agent');
begin
  new.spec := new.spec - '_by';
  if by_whom not in ('agent', 'person', 'undo') then
    by_whom := 'agent';
  end if;
  if (new.spec -> 'rev') is distinct from (old.spec -> 'rev') and new.spec ? 'rev' then
    insert into public.portrait_versions (owner_id, rev, spec, made_by)
    values (new.owner_id, (new.spec ->> 'rev')::int, new.spec, by_whom);
    -- Keep the newest 50.
    delete from public.portrait_versions
    where owner_id = new.owner_id
      and id not in (
        select id from public.portrait_versions where owner_id = new.owner_id order by id desc limit 50
      );
  end if;
  return new;
end;
$$;

create trigger portraits_version before update of spec on public.portraits
  for each row execute function public.record_portrait_version();

-- Today's portraits start their history where they are now.
insert into public.portrait_versions (owner_id, rev, spec, made_by)
select owner_id, (spec ->> 'rev')::int, spec, 'agent'
from public.portraits
where spec ? 'rev';
