begin;
insert into auth.users(id,email) values
('10000000-0000-4000-8000-000000000001','sa-artist-test@example.com'),
('10000000-0000-4000-8000-000000000002','sa-pro-test@example.com'),
('10000000-0000-4000-8000-000000000003','sa-outsider-test@example.com');

set local role authenticated;
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000001","email":"sa-artist-test@example.com","role":"authenticated"}';
insert into public.sa_market_projects(id,artist_id,pro_email,name,brief)
values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','sa-pro-test@example.com','Integration test','{"genre":"Pop","brief":"Produce my demo"}');
do $$ begin
  begin
    update public.sa_market_projects set status='quoted',quote='{"price":650}',row_version=2 where id='20000000-0000-4000-8000-000000000001';
    raise exception 'TEST FAILED: artist could quote';
  exception when raise_exception then if sqlerrm like 'TEST FAILED%' then raise; end if; end;
end $$;

set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000002","email":"sa-pro-test@example.com","role":"authenticated"}';
do $$ begin if (select count(*) from public.sa_market_projects where id='20000000-0000-4000-8000-000000000001')<>1 then raise exception 'Pro cannot read invitation'; end if; end $$;
update public.sa_market_projects set status='quoted',quote=jsonb_build_object('price',650,'scope','Production and stems','date',(current_date+30)::text,'revisions',2,'hourly',50,'rights','Agreed test terms'),row_version=2 where id='20000000-0000-4000-8000-000000000001';

set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000003","email":"sa-outsider-test@example.com","role":"authenticated"}';
do $$ begin if exists(select 1 from public.sa_market_projects where id='20000000-0000-4000-8000-000000000001') then raise exception 'Outsider can read project'; end if; end $$;

set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000001","email":"sa-artist-test@example.com","role":"authenticated"}';
update public.sa_market_projects set status='active',row_version=3 where id='20000000-0000-4000-8000-000000000001';
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000002","email":"sa-pro-test@example.com","role":"authenticated"}';
select public.sa_market_deliver('20000000-0000-4000-8000-000000000001',3,'30000000-0000-4000-8000-000000000001','Version 1','https://songarchitect.co.uk/assets/daylight-v1.wav','First version');
select public.sa_market_deliver('20000000-0000-4000-8000-000000000001',3,'30000000-0000-4000-8000-000000000001','Version 1','https://songarchitect.co.uk/assets/daylight-v1.wav','First version');

set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000001","email":"sa-artist-test@example.com","role":"authenticated"}';
insert into public.sa_market_messages(project_id,author_id,sender_role,body,version_id,seconds) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','artist','Lift the chorus','30000000-0000-4000-8000-000000000001',4);
do $$ begin
  begin
    insert into public.sa_market_messages(project_id,author_id,sender_role,body) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','pro','Forged message');
    raise exception 'TEST FAILED: forged sender allowed';
  exception when insufficient_privilege then null; end;
end $$;
select public.sa_market_revision('20000000-0000-4000-8000-000000000001',4,'40000000-0000-4000-8000-000000000001','Revision request');
select public.sa_market_revision('20000000-0000-4000-8000-000000000001',4,'40000000-0000-4000-8000-000000000001','Revision request');
do $$ begin if (select revision_requests from public.sa_market_projects where id='20000000-0000-4000-8000-000000000001')<>1 then raise exception 'Retry consumed extra revision'; end if; end $$;

set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000002","email":"sa-pro-test@example.com","role":"authenticated"}';
select public.sa_market_deliver('20000000-0000-4000-8000-000000000001',5,'30000000-0000-4000-8000-000000000002','Version 2','https://songarchitect.co.uk/assets/daylight-v2.wav','Updated arrangement');
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000001","email":"sa-artist-test@example.com","role":"authenticated"}';
update public.sa_market_projects set status='complete',row_version=7 where id='20000000-0000-4000-8000-000000000001';
do $$ begin if (select status from public.sa_market_projects where id='20000000-0000-4000-8000-000000000001')<>'complete' then raise exception 'Approval not saved'; end if; end $$;

set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000003","email":"sa-outsider-test@example.com","role":"authenticated"}';
do $$ begin if exists(select 1 from public.sa_market_versions) or exists(select 1 from public.sa_market_messages) then raise exception 'Outsider can read versions/messages'; end if; end $$;
rollback;
