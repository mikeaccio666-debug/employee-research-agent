-- Step 1: accounts, profiles and draft portraits.
-- Every person gets a profile (with a generated alias) and one draft portrait when they first
-- sign in. Row-level security keeps both private to their owner; the only public read is the
-- public_portraits view, which shows published, public portraits and nothing else.

create type public.visibility as enum ('public', 'anonymous', 'link', 'hidden');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- {domain}/@handle. Chosen when publishing; lowercase letters, digits and hyphens.
  handle text unique check (handle ~ '^[a-z0-9][a-z0-9-]{1,29}$'),
  display_name text check (char_length(display_name) <= 80),
  -- What startups see while the person is anonymous (quiet-otter). Never derived from the name.
  alias text not null unique,
  -- New people start anonymous and discoverable (PRD decision).
  visibility public.visibility not null default 'anonymous',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.portraits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  -- The page spec the agent writes (sections, claims, sources). Filled from step 2 on.
  spec jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger portraits_touch before update on public.portraits
  for each row execute function public.touch_updated_at();

-- An alias reads like a name: adjective-animal, with a number only if both words are taken.
create function public.new_alias() returns text
language plpgsql set search_path = '' as $$
declare
  adjectives text[] := array['quiet','paper','night','amber','slow','field','low','bright','still','north',
    'early','silver','small','clear','warm','late','swift','pale','round','open'];
  animals text[] := array['otter','kite','heron','finch','comet','vole','tide','lark','wren','fox',
    'owl','hare','crane','moth','seal','robin','marten','plover','newt','stork'];
  candidate text;
begin
  for i in 1..40 loop
    candidate := adjectives[1 + floor(random() * array_length(adjectives, 1))::int] || '-' ||
                 animals[1 + floor(random() * array_length(animals, 1))::int];
    if i > 20 then
      candidate := candidate || '-' || (10 + floor(random() * 90))::int;
    end if;
    if not exists (select 1 from public.profiles where alias = candidate) then
      return candidate;
    end if;
  end loop;
  return 'person-' || substr(md5(random()::text), 1, 8);
end;
$$;

-- First sign-in: create the profile and an empty draft portrait.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, alias)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), ''),
    public.new_alias()
  );
  insert into public.portraits (owner_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row-level security: everything is private to its owner.
alter table public.profiles enable row level security;
alter table public.portraits enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: update own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "portraits: read own" on public.portraits
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "portraits: update own" on public.portraits
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- People may change their handle, name and visibility; the alias and ids are not theirs to edit.
revoke update on public.profiles from authenticated;
grant update (handle, display_name, visibility) on public.profiles to authenticated;
revoke update on public.portraits from authenticated;
grant update (spec, status, published_at) on public.portraits to authenticated;

-- The one public read: published portraits of people who chose Public. No ids, no alias.
create view public.public_portraits as
  select pr.handle, pr.display_name, po.spec, po.published_at
  from public.portraits po
  join public.profiles pr on pr.id = po.owner_id
  where po.status = 'published' and pr.visibility = 'public' and pr.handle is not null;

grant select on public.public_portraits to anon, authenticated;

-- Anyone who signed in before this migration ran gets their profile and draft portrait now.
insert into public.profiles (id, display_name, alias)
select u.id,
       nullif(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'), ''),
       public.new_alias()
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

insert into public.portraits (owner_id)
select p.id from public.profiles p
where not exists (select 1 from public.portraits po where po.owner_id = p.id);
