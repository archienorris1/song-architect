begin;
-- Membership is deliberately outside the Data API. Only an administrator of the
-- database can assign or revoke staff, using the confirmed account's user ID.
create table sa_profile_private.admin_members (
 user_id uuid primary key references auth.users(id),
 enabled boolean not null default true,
 created_at timestamptz not null default now()
);
alter table sa_profile_private.admin_members enable row level security;
revoke all on sa_profile_private.admin_members from public,anon,authenticated;
create function sa_profile_private.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from sa_profile_private.admin_members m join auth.users u on u.id=m.user_id
  where m.user_id=auth.uid() and m.enabled and u.email_confirmed_at is not null
    and (u.banned_until is null or u.banned_until<now())
 );
$$;
revoke all on function sa_profile_private.is_admin() from public,anon;
grant execute on function sa_profile_private.is_admin() to authenticated;
create function public.sa_admin_access() returns boolean language sql stable security invoker set search_path='' as $$
 select sa_profile_private.is_admin();
$$;
revoke all on function public.sa_admin_access() from public,anon;
grant execute on function public.sa_admin_access() to authenticated;

alter table public.sa_pro_public_profiles add column featured boolean not null default false,
 add column roster_version integer not null default 1 check(roster_version>0);
create table public.sa_pro_review_notes (
 owner_id uuid primary key references auth.users(id),
 decision text not null check(decision in ('approved','changes_requested','paused','restored')),
 note text not null default '' check(length(note)<=1000),
 reviewed_version integer,
 updated_at timestamptz not null default now()
);
alter table public.sa_pro_review_notes enable row level security;
revoke all on public.sa_pro_review_notes from public,anon,authenticated;
grant select on public.sa_pro_review_notes to authenticated;
create policy sa_pro_review_owner on public.sa_pro_review_notes for select to authenticated using(owner_id=(select auth.uid()));
create table sa_profile_private.admin_audit (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id),
 owner_id uuid not null references auth.users(id),
 action text not null,
 note text not null,
 draft_version integer,
 roster_version integer,
 created_at timestamptz not null default now()
);
alter table sa_profile_private.admin_audit enable row level security;
revoke all on sa_profile_private.admin_audit from public,anon,authenticated;

create function sa_profile_private.dashboard() returns jsonb
language plpgsql security definer set search_path='' as $$
declare profiles jsonb; attention jsonb; total integer;
begin
 if not sa_profile_private.is_admin() then raise exception 'SA admin access required' using errcode='42501'; end if;
 select count(*) into total from (
  select d.owner_id from public.sa_pro_profile_drafts d join auth.users u on u.id=d.owner_id where review_status='pending' and (u.banned_until is null or u.banned_until<now())
  union select p.owner_id from public.sa_pro_public_profiles p join auth.users u on u.id=p.owner_id where u.banned_until is null or u.banned_until<now()
 ) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.pending desc,x.updated_at desc),'[]') into profiles from (
  select coalesce(d.owner_id,p.owner_id) owner_id,
   d.profile draft_profile,d.row_version draft_version,(d.owner_id is not null) pending,
   to_jsonb(p) published,to_jsonb(n) review,
   coalesce(d.updated_at,p.approved_at) updated_at
  from (select * from public.sa_pro_profile_drafts where review_status='pending') d
  full join public.sa_pro_public_profiles p on p.owner_id=d.owner_id
  left join public.sa_pro_review_notes n on n.owner_id=coalesce(d.owner_id,p.owner_id)
  join auth.users u on u.id=coalesce(d.owner_id,p.owner_id)
  where u.banned_until is null or u.banned_until<now()
  order by (d.owner_id is not null) desc,coalesce(d.updated_at,p.approved_at) desc limit 200
 ) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.last_activity),'[]') into attention from (
  select p.id,p.name,p.status,p.pro_email,p.quote->>'date' due_date,
    greatest(p.updated_at,coalesce((select max(m.created_at) from public.sa_market_messages m where m.project_id=p.id),p.updated_at)) last_activity,
    case when p.status='active' and p.quote->>'date'<to_char(current_date,'YYYY-MM-DD') then 'Past agreed delivery date'
     when p.status='brief' then 'Brief awaiting a quote'
     when p.status='quoted' then 'Quote awaiting a decision'
     when p.status='review' then 'Delivery awaiting artist feedback'
     else 'No recent project activity' end reason
  from public.sa_market_projects p join auth.users u on u.id=p.artist_id
  where p.status<>'complete' and (u.banned_until is null or u.banned_until<now())
   and ((p.status='active' and p.quote->>'date'<to_char(current_date,'YYYY-MM-DD'))
    or greatest(p.updated_at,coalesce((select max(m.created_at) from public.sa_market_messages m where m.project_id=p.id),p.updated_at))<now()-interval '7 days')
  order by last_activity limit 100
 ) x;
 return jsonb_build_object('profiles',profiles,'profile_total',total,'attention',attention,'checked_at',now());
end;
$$;
revoke all on function sa_profile_private.dashboard() from public,anon;
grant execute on function sa_profile_private.dashboard() to authenticated;
create function public.sa_admin_dashboard() returns jsonb language sql security invoker set search_path='' as $$select sa_profile_private.dashboard();$$;
revoke all on function public.sa_admin_dashboard() from public,anon;
grant execute on function public.sa_admin_dashboard() to authenticated;

create function sa_profile_private.review_profile(p_owner uuid,p_action text,p_draft_version integer,p_roster_version integer,p_note text) returns void
language plpgsql security definer set search_path='' as $$
declare d public.sa_pro_profile_drafts; p public.sa_pro_public_profiles; decision text;
begin
 if not sa_profile_private.is_admin() then raise exception 'SA admin access required' using errcode='42501'; end if;
 if p_owner=auth.uid() then raise exception 'Another SA administrator must review your profile'; end if;
 if p_action is null or p_action not in ('approve','changes','pause','restore','feature','unfeature') then raise exception 'Choose a supported review action'; end if;
 if p_note is null or length(p_note)>1000 or (p_action in ('changes','pause') and length(trim(p_note))=0) then raise exception 'Add a short note explaining what needs to change'; end if;
 select * into d from public.sa_pro_profile_drafts where owner_id=p_owner for update;
 select * into p from public.sa_pro_public_profiles where owner_id=p_owner for update;
 if coalesce(p.roster_version,0) is distinct from p_roster_version then raise exception 'This listing changed. Refresh before reviewing'; end if;
 if p_action in ('approve','changes') then
  if d.owner_id is null or d.review_status<>'pending' or d.row_version is distinct from p_draft_version then raise exception 'This application changed. Refresh before reviewing'; end if;
  if p_action='approve' then
   if not exists(select 1 from auth.users where id=p_owner and email_confirmed_at is not null and (banned_until is null or banned_until<now())) then raise exception 'The applicant needs a confirmed, active account'; end if;
   insert into public.sa_pro_public_profiles(owner_id,profile,is_listed,featured,roster_version)
    values(p_owner,d.profile,true,false,1)
   on conflict(owner_id) do update set profile=excluded.profile,approved_at=now(),roster_version=sa_pro_public_profiles.roster_version+1;
   -- Existing paused listings stay paused when new profile copy is approved.
   decision:='approved';
  else decision:='changes_requested'; end if;
  update public.sa_pro_profile_drafts set review_status='draft',row_version=row_version+1 where owner_id=p_owner;
 else
  if p.owner_id is null then raise exception 'This professional has no approved listing'; end if;
  if (p_action='pause' and not p.is_listed) or (p_action='restore' and p.is_listed)
   or (p_action='feature' and (p.featured or not p.is_listed)) or (p_action='unfeature' and not p.featured) then raise exception 'This listing changed. Refresh before reviewing'; end if;
  if p_action='restore' and not exists(select 1 from auth.users where id=p_owner and email_confirmed_at is not null and (banned_until is null or banned_until<now())) then raise exception 'The professional needs a confirmed, active account'; end if;
  update public.sa_pro_public_profiles set
   is_listed=case p_action when 'pause' then false when 'restore' then true else is_listed end,
   featured=case p_action when 'feature' then true when 'unfeature' then false when 'pause' then false else featured end,
   roster_version=roster_version+1 where owner_id=p_owner;
  if p_action='pause' then decision:='paused'; elsif p_action='restore' then decision:='restored'; end if;
 end if;
 if decision is not null then
  insert into public.sa_pro_review_notes(owner_id,decision,note,reviewed_version)
   values(p_owner,decision,trim(p_note),d.row_version)
  on conflict(owner_id) do update set decision=excluded.decision,note=excluded.note,reviewed_version=excluded.reviewed_version,updated_at=now();
 end if;
 insert into sa_profile_private.admin_audit(actor_id,owner_id,action,note,draft_version,roster_version)
  values(auth.uid(),p_owner,p_action,trim(p_note),d.row_version,p.roster_version);
end;
$$;
revoke all on function sa_profile_private.review_profile(uuid,text,integer,integer,text) from public,anon;
grant execute on function sa_profile_private.review_profile(uuid,text,integer,integer,text) to authenticated;
create function public.sa_admin_review(p_owner uuid,p_action text,p_draft_version integer,p_roster_version integer,p_note text)
returns void language sql security invoker set search_path='' as $$select sa_profile_private.review_profile(p_owner,p_action,p_draft_version,p_roster_version,p_note);$$;
revoke all on function public.sa_admin_review(uuid,text,integer,integer,text) from public,anon;
grant execute on function public.sa_admin_review(uuid,text,integer,integer,text) to authenticated;
-- Staff can listen only to submitted work, never another pro's unsent drafts.
create policy sa_pro_sample_reviewer on storage.objects for select to authenticated using(
 bucket_id='sa-pro-samples' and (select sa_profile_private.is_admin()) and exists(
  select 1 from public.sa_pro_profile_drafts d,jsonb_array_elements(d.profile->'work') w where d.review_status='pending' and w->>'audio_path'=storage.objects.name
 )
);
-- RLS exposes submitted drafts to staff for sample authorization. No staff
-- UPDATE policy is added. Review mutations run only through the guarded RPC.
create policy sa_pro_submitted_reviewer on public.sa_pro_profile_drafts for select to authenticated
 using(review_status='pending' and (select sa_profile_private.is_admin()));
create policy sa_pro_listing_reviewer on public.sa_pro_public_profiles for select to authenticated
 using((select sa_profile_private.is_admin()));
commit;
