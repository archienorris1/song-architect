begin;
create or replace function sa_profile_private.dashboard() returns jsonb
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
commit;
