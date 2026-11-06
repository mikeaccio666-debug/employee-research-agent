-- Step 4: talk first, sign up later (PRD ACC-02).
-- People can start in the studio before making an account: Supabase's anonymous sign-in gives them
-- a real (anonymous) user, so the profile, portrait, chat and résumés are theirs from the first
-- message. Signing up later links Google, GitHub, LinkedIn or an email to that same user, so
-- nothing has to move. Until then a few limits apply, enforced here rather than in the app.

-- Whether the request comes from an anonymous sign-in (Supabase puts it in the JWT).
create function public.is_anonymous() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

-- How many messages the person has sent in one of their conversations, and how many sources they
-- have. Counted outside row-level security (a policy can't read its own table through its own
-- policies), so each only ever counts the caller's own rows.
create function public.messages_sent(conversation uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from public.conversation_messages m
  join public.conversations c on c.id = m.conversation_id
  where m.conversation_id = conversation and m.role = 'user' and c.owner_id = auth.uid();
$$;

create function public.sources_count() returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from public.sources where owner_id = auth.uid();
$$;

revoke execute on function public.messages_sent(uuid), public.sources_count() from public, anon;
grant execute on function public.messages_sent(uuid), public.sources_count() to authenticated;

-- Restrictive policies narrow the existing "own rows" ones; they never widen them.

-- At most 30 of their own messages to the agent before they sign up (the PRD asks for 10 or more).
-- The agent's replies and tool rows are not counted, so a turn that started always finishes.
create policy "messages: anonymous trial limit" on public.conversation_messages
  as restrictive for insert to authenticated
  with check (
    role <> 'user'
    or not public.is_anonymous()
    or public.messages_sent(conversation_id) < 30
  );

-- At most 3 résumés or links.
create policy "sources: anonymous trial limit" on public.sources
  as restrictive for insert to authenticated
  with check (
    not public.is_anonymous()
    or public.sources_count() < 3
  );

-- Nothing anonymous goes public: no handle, and the portrait stays a draft.
create policy "profiles: anonymous can't claim a link" on public.profiles
  as restrictive for update to authenticated
  using (true)
  with check (not public.is_anonymous() or handle is null);

create policy "portraits: anonymous can't publish" on public.portraits
  as restrictive for update to authenticated
  using (true)
  with check (not public.is_anonymous() or status = 'draft');
