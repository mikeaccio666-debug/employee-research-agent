-- Step 4: privacy controls the person runs themselves (PRD PRIV-02, PRIV-05, PRIV-06).
-- Who may see each sensitive field, a fresh alias on request, and deleting the account outright.

-- PRIV-02. For each sensitive field: 0 matching only, 1 after connecting, 2 public.
-- wa: work authorization · pay: pay expectations · ct: contact details.
create function public.valid_field_levels(levels jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(levels) = 'object'
     and not exists (
       select 1 from jsonb_each(levels) e
       where e.key not in ('wa', 'pay', 'ct')
          or jsonb_typeof(e.value) <> 'number'
          or e.value::text not in ('0', '1', '2')
     );
$$;

alter table public.profiles
  add column field_levels jsonb not null default '{"wa": 0, "pay": 0, "ct": 1}'::jsonb
  check (public.valid_field_levels(field_levels));

grant update (field_levels) on public.profiles to authenticated;

-- PRIV-05. A new alias, drawn the same way as the first: random words, never from the person.
create function public.renew_alias() returns text
language plpgsql security definer set search_path = '' as $$
declare
  fresh text;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  fresh := public.new_alias();
  update public.profiles set alias = fresh where id = auth.uid();
  return fresh;
end;
$$;

revoke execute on function public.renew_alias() from public, anon;
grant execute on function public.renew_alias() to authenticated;

-- PRIV-06. Deleting the account deletes the sign-in, and with it (on delete cascade) the profile,
-- portrait, versions, conversations and sources. Résumé files are removed through the Storage API
-- first (lib/account-actions.ts), since Storage keeps its own records of them.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
