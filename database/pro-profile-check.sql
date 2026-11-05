-- Transactional access-control regression check. No test rows are retained.
begin;
insert into auth.users(id,email,email_confirmed_at) values
('90000000-0000-4000-8000-000000000001','profile-pro-check@example.invalid',now()),
('90000000-0000-4000-8000-000000000002','profile-artist-check@example.invalid',now());

set local role authenticated;
set local request.jwt.claims='{"sub":"90000000-0000-4000-8000-000000000001","email":"profile-pro-check@example.invalid","role":"authenticated"}';
insert into public.sa_pro_profile_drafts(owner_id,profile,review_status) values
('90000000-0000-4000-8000-000000000001',
'{"name":"Profile check","headline":"Pop producer","bio":"Integration-test fixture","service":"Production","scope":"Production and stems","genres":["Pop"],"price":650,"days":14,"revisions":2,"hourly":50,"work":[{"id":"example","title":"Example release","credit":"Production","url":"https://open.spotify.com/playlist/1TzrniJVIYWgntzyzXVlBb","audio_path":""}]}',
'pending');
do $$ begin
  begin
    insert into public.sa_pro_public_profiles(owner_id,profile)
    select owner_id,profile from public.sa_pro_profile_drafts;
    raise exception 'TEST FAILED: professional could self-approve';
  exception when insufficient_privilege then null; end;
end $$;

set local request.jwt.claims='{"sub":"90000000-0000-4000-8000-000000000002","email":"profile-artist-check@example.invalid","role":"authenticated"}';
do $$ begin
  if exists(select 1 from public.sa_pro_profile_drafts where owner_id='90000000-0000-4000-8000-000000000001') then raise exception 'TEST FAILED: private draft visible to other account'; end if;
end $$;

reset role;
insert into public.sa_pro_public_profiles(owner_id,profile)
select owner_id,profile from public.sa_pro_profile_drafts where owner_id='90000000-0000-4000-8000-000000000001';

set local role anon;
do $$ begin
  if (select count(*) from public.sa_pro_public_profiles where owner_id='90000000-0000-4000-8000-000000000001')<>1 then raise exception 'TEST FAILED: approved profile unavailable'; end if;
end $$;
set local role authenticated;
set local request.jwt.claims='{"sub":"90000000-0000-4000-8000-000000000001","email":"profile-pro-check@example.invalid","role":"authenticated"}';
update public.sa_pro_profile_drafts set profile=jsonb_set(profile,'{price}','750'),row_version=2 where owner_id='90000000-0000-4000-8000-000000000001';
set local role anon;
do $$ begin
  if (select (profile->>'price')::integer from public.sa_pro_public_profiles where owner_id='90000000-0000-4000-8000-000000000001')<>650 then raise exception 'TEST FAILED: unreviewed edits changed public profile'; end if;
end $$;
set local role authenticated;
set local request.jwt.claims='{"sub":"90000000-0000-4000-8000-000000000002","email":"profile-artist-check@example.invalid","role":"authenticated"}';
select public.sa_request_profile_quote('90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000003','{"name":"Quote check","brief":"Produce my demo"}');
select public.sa_request_profile_quote('90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000003','{"name":"Quote check","brief":"Produce my demo"}');
do $$ begin
  if (select count(*) from public.sa_market_projects where id='90000000-0000-4000-8000-000000000003')<>1 then raise exception 'TEST FAILED: request retry was not idempotent'; end if;
  if (select (brief->'package'->>'price')::integer from public.sa_market_projects where id='90000000-0000-4000-8000-000000000003')<>650 then raise exception 'TEST FAILED: quote used unreviewed terms'; end if;
end $$;

reset role;
update public.sa_pro_public_profiles set is_listed=false where owner_id='90000000-0000-4000-8000-000000000001';
set local role anon;
do $$ begin
  if exists(select 1 from public.sa_pro_public_profiles where owner_id='90000000-0000-4000-8000-000000000001') then raise exception 'TEST FAILED: withdrawn profile is public'; end if;
end $$;
rollback;
