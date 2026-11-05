begin;
-- An approved business sign-in may be reserved before its Auth user exists.
-- Email comes from the confirmed database identity, never editable JWT metadata.
create table sa_profile_private.admin_emails (
 email text primary key check(email=lower(trim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 enabled boolean not null default true
);
alter table sa_profile_private.admin_emails enable row level security;
revoke all on sa_profile_private.admin_emails from public,anon,authenticated;
create policy sa_admin_emails_deny on sa_profile_private.admin_emails for all to authenticated using(false) with check(false);
create policy sa_admin_members_deny on sa_profile_private.admin_members for all to authenticated using(false) with check(false);
create policy sa_admin_audit_deny on sa_profile_private.admin_audit for all to authenticated using(false) with check(false);
create or replace function sa_profile_private.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null
   and (u.banned_until is null or u.banned_until<now())
   and (exists(select 1 from sa_profile_private.admin_members m where m.user_id=u.id and m.enabled)
    or exists(select 1 from sa_profile_private.admin_emails e where e.email=lower(u.email) and e.enabled))
 );
$$;
commit;
