-- Lets a signed-in user delete their own account and every record they own.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- The app calls it with sb.rpc('delete_own_account') from the account menu.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Records first (in one transaction with the account), then the auth user itself.
  delete from public.sets
    where session_id in (select id from public.sessions where user_id = uid);
  delete from public.sessions where user_id = uid;
  delete from public.exercises where user_id = uid;
  delete from public.body_weights where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

-- Only signed-in users may call it, and auth.uid() limits it to their own account.
revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
