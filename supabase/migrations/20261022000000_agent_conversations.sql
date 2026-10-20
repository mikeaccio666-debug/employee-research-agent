-- Step 2: the agent draws the portrait in conversation.
-- One running conversation per person, its history kept append-only exactly as the model
-- returned it, a log of model calls, and a published copy of the portrait so that drafts,
-- rejected lines and the chat quotes behind each line never reach the public view.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  -- companion: the portrait studio's conversation. Other purposes arrive with later steps.
  purpose text not null default 'companion' check (purpose in ('companion')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, purpose)
);

create trigger conversations_touch before update on public.conversations
  for each row execute function public.touch_updated_at();

create table public.conversation_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  -- user: what the person typed; assistant: one model response; tool: our answers to its tool calls.
  role text not null check (role in ('user', 'assistant', 'tool')),
  -- The model provider's input/output items, replayed verbatim on the next turn. Never rewritten.
  items jsonb not null,
  -- What the thread shows: the person's words or the agent's reply. Null for tool rows.
  body text check (char_length(body) <= 20000),
  created_at timestamptz not null default now()
);

create index conversation_messages_conversation on public.conversation_messages (conversation_id, id);

create table public.model_calls (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  provider text not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  cached_tokens integer,
  latency_ms integer,
  stop_reason text,
  error text,
  created_at timestamptz not null default now()
);

-- Row-level security: a person reads and appends to their own conversation; nothing is edited
-- or deleted from the browser.
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.model_calls enable row level security;

create policy "conversations: read own" on public.conversations
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "conversations: start own" on public.conversations
  for insert to authenticated with check ((select auth.uid()) = owner_id);

create policy "messages: read own" on public.conversation_messages
  for select to authenticated using (
    exists (select 1 from public.conversations c
            where c.id = conversation_id and c.owner_id = (select auth.uid())));
create policy "messages: append own" on public.conversation_messages
  for insert to authenticated with check (
    exists (select 1 from public.conversations c
            where c.id = conversation_id and c.owner_id = (select auth.uid())));

create policy "model calls: read own" on public.model_calls
  for select to authenticated using (
    exists (select 1 from public.conversations c
            where c.id = conversation_id and c.owner_id = (select auth.uid())));
create policy "model calls: log own" on public.model_calls
  for insert to authenticated with check (
    exists (select 1 from public.conversations c
            where c.id = conversation_id and c.owner_id = (select auth.uid())));

revoke update, delete on public.conversations, public.conversation_messages, public.model_calls from authenticated;

-- The published portrait: confirmed lines only, without the quotes they came from. Written when
-- the person publishes; the draft in `spec` keeps changing in the studio until they do again.
alter table public.portraits add column published_spec jsonb not null default '{}'::jsonb;
grant update (published_spec) on public.portraits to authenticated;

create or replace view public.public_portraits as
  select pr.handle, pr.display_name, po.published_spec as spec, po.published_at
  from public.portraits po
  join public.profiles pr on pr.id = po.owner_id
  where po.status = 'published' and pr.visibility = 'public' and pr.handle is not null;
