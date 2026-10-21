-- Connected apps (PRD ECO-01): a person signs in to an app such as Notion so the studio agent can
-- search and read it over MCP, read-only. One row per person and app. The tokens never sit here
-- in the clear: `secret` is sealed with AES-256-GCM under CONNECTOR_KEY, which only the server
-- holds (apps/web/lib/connectors/seal.ts). Disconnecting deletes the row.

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  -- Which app: an id from apps/web/lib/connectors/catalog.ts. Checked by the app, not here, so a
  -- new app is one catalog entry and no migration.
  provider text not null check (provider ~ '^[a-z][a-z0-9_-]{0,39}$'),
  -- pending: they started signing in, or the app stopped accepting the sign-in. active: connected.
  status text not null default 'pending' check (status in ('pending', 'active')),
  -- The OAuth state nonce of a sign-in in progress.
  state text check (char_length(state) <= 100),
  -- Sealed: our registration with the app, its tokens, the sign-in's PKCE verifier.
  secret text not null default '' check (char_length(secret) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, provider)
);

alter table public.connections enable row level security;

create policy "connections: owner reads" on public.connections
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "connections: owner adds" on public.connections
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "connections: owner updates" on public.connections
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "connections: owner removes" on public.connections
  for delete to authenticated using (owner_id = (select auth.uid()));

revoke all on public.connections from anon, authenticated;
grant select, insert, update, delete on public.connections to authenticated;

-- A page the agent read from a connected app is one of the person's sources, like a link, with
-- the app's id as its kind. Like `provider`, the app checks which kinds exist.
alter table public.sources drop constraint sources_kind_check;
alter table public.sources add constraint sources_kind_check check (kind ~ '^[a-z][a-z0-9_-]{0,39}$');

-- Apps people asked for that can't be connected yet: "I want this" in the app store, or an app
-- the agent heard them mention (offer_connect). Counted across everyone, it says which app to
-- build next. `app` is a catalog id or the name they used, lowercased.
create table public.app_requests (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  app text not null check (app ~ '^[a-z0-9][a-z0-9 ._-]{0,39}$'),
  source text not null check (source in ('store', 'chat')),
  created_at timestamptz not null default now(),
  primary key (owner_id, app)
);

alter table public.app_requests enable row level security;

create policy "app_requests: owner reads" on public.app_requests
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "app_requests: owner adds" on public.app_requests
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "app_requests: owner removes" on public.app_requests
  for delete to authenticated using (owner_id = (select auth.uid()));

revoke all on public.app_requests from anon, authenticated;
grant select, insert, delete on public.app_requests to authenticated;
