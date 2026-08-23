-- Both trigger functions were reachable as REST RPC endpoints. Neither
-- would survive the call — they dereference `new`, which only exists
-- inside a trigger — but "it errors" is not a security posture, and the
-- linter is right to say so.
--
-- They need different fixes, because they need different privileges.

-- touch_updated_at only assigns a column on the row being written. It
-- never needed elevated rights; SECURITY DEFINER was cargo-culted in
-- from the pattern next to it.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- handle_new_user genuinely must stay SECURITY DEFINER: it writes to
-- public.profiles from a trigger on auth.users, which the calling role
-- has no rights over. So the fix is to make it uncallable instead.
-- Triggers are unaffected — the trigger mechanism invokes the function
-- as the table owner and does not consult the caller's EXECUTE grant.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
