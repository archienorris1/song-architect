-- All fixtures and decisions roll back. Run as database administrator.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('91000000-0000-4000-8000-000000000001','admin-check@example.invalid',now(),'{}'),
 ('91000000-0000-4000-8000-000000000002','pro-check@example.invalid',now(),'{"admin":true}'),
 ('91000000-0000-4000-8000-000000000003','outsider-check@example.invalid',now(),'{}');
insert into sa_profile_private.admin_members(user_id) values('91000000-0000-4000-8000-000000000001');
insert into public.sa_pro_profile_drafts(owner_id,profile,review_status) values
 ('91000000-0000-4000-8000-000000000002','{"name":"Review check","headline":"Pop producer","bio":"Transactional test","service":"Production","scope":"Production and stems","genres":["Pop"],"price":650,"days":14,"revisions":2,"hourly":50,"work":[{"id":"example","title":"Example","credit":"Production","url":"https://open.spotify.com/playlist/1TzrniJVIYWgntzyzXVlBb","audio_path":""}]}','pending');
insert into public.sa_market_projects(id,artist_id,pro_email,name,brief,quote,status) values(
 '91000000-0000-4000-8000-000000000004','91000000-0000-4000-8000-000000000003','pro-check@example.invalid','Overdue test','{"brief":"Private test brief"}',
 '{"price":650,"scope":"Production","date":"2000-01-01","revisions":2,"hourly":50,"rights":"Artist owns master"}','active');
set local role authenticated;
set local request.jwt.claims='{"sub":"91000000-0000-4000-8000-000000000002","email":"pro-check@example.invalid","role":"authenticated","user_metadata":{"admin":true}}';
do $$ begin
 if public.sa_admin_access() then raise exception 'TEST FAILED metadata granted admin'; end if;
 begin perform public.sa_admin_dashboard(); raise exception 'TEST FAILED pro read dashboard'; exception when insufficient_privilege then null; end;
 begin perform public.sa_admin_review('91000000-0000-4000-8000-000000000002','approve',1,0,''); raise exception 'TEST FAILED pro self approval'; exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claims='{"sub":"91000000-0000-4000-8000-000000000001","email":"admin-check@example.invalid","role":"authenticated"}';
do $$ begin
 if not public.sa_admin_access() then raise exception 'TEST FAILED staff access'; end if;
 if not exists(select 1 from jsonb_array_elements(public.sa_admin_dashboard()->'attention') p where p->>'id'='91000000-0000-4000-8000-000000000004' and p->>'reason'='Past agreed delivery date' and not p ? 'brief') then raise exception 'TEST FAILED project attention'; end if;
 begin perform public.sa_admin_review(auth.uid(),'approve',1,0,''); raise exception 'TEST FAILED staff self review'; exception when raise_exception then if sqlerrm like 'TEST FAILED%' then raise; end if; end;
 if not exists(select 1 from jsonb_array_elements(public.sa_admin_dashboard()->'profiles') p where p->>'owner_id'='91000000-0000-4000-8000-000000000002' and p->>'pending'='true') then raise exception 'TEST FAILED inbox'; end if;
 begin perform public.sa_admin_review('91000000-0000-4000-8000-000000000002','approve',99,0,''); raise exception 'TEST FAILED stale version approved'; exception when raise_exception then if sqlerrm like 'TEST FAILED%' then raise; end if; end;
 begin perform public.sa_admin_review('91000000-0000-4000-8000-000000000002','changes',1,0,''); raise exception 'TEST FAILED empty feedback accepted'; exception when raise_exception then if sqlerrm like 'TEST FAILED%' then raise; end if; end;
end $$;
select public.sa_admin_review('91000000-0000-4000-8000-000000000002','changes',1,0,'Please clarify your contribution.');
set local request.jwt.claims='{"sub":"91000000-0000-4000-8000-000000000002","email":"pro-check@example.invalid","role":"authenticated"}';
do $$ begin
 if (select note from public.sa_pro_review_notes where owner_id=auth.uid())<>'Please clarify your contribution.' then raise exception 'TEST FAILED feedback not delivered'; end if;
 begin update public.sa_pro_review_notes set note='Overwritten'; raise exception 'TEST FAILED feedback editable'; exception when insufficient_privilege then null; end;
end $$;
update public.sa_pro_profile_drafts set review_status='pending',row_version=3 where owner_id=auth.uid();
set local request.jwt.claims='{"sub":"91000000-0000-4000-8000-000000000001","email":"admin-check@example.invalid","role":"authenticated"}';
select public.sa_admin_review('91000000-0000-4000-8000-000000000002','approve',3,0,'Welcome to the roster.');
select public.sa_admin_review('91000000-0000-4000-8000-000000000002','feature',null,1,'');
do $$ begin
 if not (select featured from public.sa_pro_public_profiles where owner_id='91000000-0000-4000-8000-000000000002') then raise exception 'TEST FAILED feature'; end if;
 begin perform public.sa_admin_review('91000000-0000-4000-8000-000000000002','pause',null,1,'Hold listing.'); raise exception 'TEST FAILED stale roster changed'; exception when raise_exception then if sqlerrm like 'TEST FAILED%' then raise; end if; end;
end $$;
select public.sa_admin_review('91000000-0000-4000-8000-000000000002','pause',null,2,'Please update your credits.');
set local role anon;
do $$ begin
 if exists(select 1 from public.sa_pro_public_profiles where owner_id='91000000-0000-4000-8000-000000000002') then raise exception 'TEST FAILED paused listing public'; end if;
 begin perform public.sa_admin_dashboard(); raise exception 'TEST FAILED anon dashboard'; exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
set local request.jwt.claims='{"sub":"91000000-0000-4000-8000-000000000003","email":"info@songarchitect.co.uk","role":"authenticated"}';
do $$ begin
 if public.sa_admin_access() then raise exception 'TEST FAILED email claim bypassed confirmed identity'; end if;
 if exists(select 1 from public.sa_pro_review_notes where owner_id='91000000-0000-4000-8000-000000000002') then raise exception 'TEST FAILED feedback leaked'; end if;
 if exists(select 1 from public.sa_pro_profile_drafts where owner_id='91000000-0000-4000-8000-000000000002') then raise exception 'TEST FAILED draft leaked'; end if;
end $$;
set local request.jwt.claims='{"sub":"91000000-0000-4000-8000-000000000002","email":"pro-check@example.invalid","role":"authenticated"}';
update public.sa_pro_profile_drafts set review_status='pending',row_version=5,profile=jsonb_set(profile,'{price}','750') where owner_id=auth.uid();
set local request.jwt.claims='{"sub":"91000000-0000-4000-8000-000000000001","email":"admin-check@example.invalid","role":"authenticated"}';
select public.sa_admin_review('91000000-0000-4000-8000-000000000002','approve',5,3,'Updated credits reviewed.');
do $$ begin
 if (select is_listed from public.sa_pro_public_profiles where owner_id='91000000-0000-4000-8000-000000000002') then raise exception 'TEST FAILED approval restored paused listing'; end if;
 -- Staff cannot inspect unsent drafts, including through the dashboard.
 if exists(select 1 from public.sa_pro_profile_drafts where owner_id='91000000-0000-4000-8000-000000000002') then raise exception 'TEST FAILED unsent draft visible'; end if;
end $$;
select public.sa_admin_review('91000000-0000-4000-8000-000000000002','restore',null,4,'Back on the roster.');
set local role anon;
do $$ begin
 if (select (profile->>'price')::integer from public.sa_pro_public_profiles where owner_id='91000000-0000-4000-8000-000000000002')<>750 then raise exception 'TEST FAILED restored snapshot'; end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from sa_profile_private.admin_audit where actor_id='91000000-0000-4000-8000-000000000001')<>6 then raise exception 'TEST FAILED audit history'; end if;
end $$;
update sa_profile_private.admin_members set enabled=false where user_id='91000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims='{"sub":"91000000-0000-4000-8000-000000000001","email":"admin-check@example.invalid","role":"authenticated"}';
do $$ begin
 if public.sa_admin_access() then raise exception 'TEST FAILED revoked member retained access'; end if;
 begin perform public.sa_admin_dashboard(); raise exception 'TEST FAILED revoked member read dashboard'; exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into sa_profile_private.admin_emails(email) values('outsider-check@example.invalid');
set local role authenticated;
set local request.jwt.claims='{"sub":"91000000-0000-4000-8000-000000000003","email":"outsider-check@example.invalid","role":"authenticated"}';
do $$ begin
 if not public.sa_admin_access() then raise exception 'TEST FAILED reserved email not accepted'; end if;
end $$;
reset role;
update auth.users set email_confirmed_at=null where id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
do $$ begin
 if public.sa_admin_access() then raise exception 'TEST FAILED unconfirmed email granted staff'; end if;
end $$;
rollback;
