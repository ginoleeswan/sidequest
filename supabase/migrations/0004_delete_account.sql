-- Account deletion, from inside the app.
--
-- App Store Review Guideline 5.1.1(v): an app that lets somebody create
-- an account has to let them delete it, from the app, without writing
-- to anyone. Nothing in the schema needed to change for that — every
-- table already hangs off auth.users with ON DELETE CASCADE (0001), so
-- removing the auth row removes the profile, the library, the
-- durations, the sessions, the drops and the preferences in one
-- statement. What was missing was a way for the signed-in user to run
-- that statement, because auth.users is nobody's to touch through
-- PostgREST.
--
-- SECURITY DEFINER is what makes it possible and what makes it
-- dangerous, so the function does exactly one thing: delete the row
-- whose id is the caller's own. There is no argument to pass, so there
-- is no other user to name. An unauthenticated call has no uid and is
-- refused rather than deleting nothing quietly.
--
-- Hard delete, not a tombstone. The sync engine tombstones rows so two
-- devices can agree on what was removed; an account has no other
-- device to agree with once it is gone, and keeping a copy of what
-- somebody asked to be rid of is the opposite of what they asked for.

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'delete_account: not signed in'
      using errcode = 'insufficient_privilege';
  end if;
  delete from auth.users where id = caller;
end;
$$;

-- Callable by the signed-in role and nobody else. `public` is revoked
-- explicitly because Postgres grants EXECUTE to it on every new function
-- by default, which would let the anon key reach the function only to be
-- refused inside it — still a door that should not exist.
revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
