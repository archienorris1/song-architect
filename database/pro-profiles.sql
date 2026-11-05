begin;
create function public.sa_valid_pro_profile(p jsonb, owner_id uuid, complete boolean)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare item jsonb; field text; n numeric;
begin
  if p is null or jsonb_typeof(p)<>'object' or octet_length(p::text)>20000 then return false; end if;
  foreach field in array array['name','headline','bio','service','scope'] loop
    if jsonb_typeof(p->field) is distinct from 'string' then return false; end if;
  end loop;
  if length(p->>'name')>80 or length(p->>'headline')>100 or length(p->>'bio')>1000 or length(p->>'service')>80 or length(p->>'scope')>2000 then return false; end if;
  if jsonb_typeof(p->'genres') is distinct from 'array' or jsonb_array_length(p->'genres')>4
     or jsonb_typeof(p->'work') is distinct from 'array' or jsonb_array_length(p->'work')>4 then return false; end if;
  for item in select jsonb_array_elements(p->'genres') loop
    if jsonb_typeof(item)<>'string' or length(item#>>'{}')>60 then return false; end if;
  end loop;
  foreach field in array array['price','days','revisions','hourly'] loop
    if p->field is distinct from 'null'::jsonb then
      if jsonb_typeof(p->field) is distinct from 'number' then return false; end if;
      n:=(p->>field)::numeric;
      if (field='price' and (n<25 or n>50000 or n<>round(n,2)))
         or (field='days' and (n<1 or n>90 or n<>trunc(n)))
         or (field='revisions' and (n<0 or n>20 or n<>trunc(n)))
         or (field='hourly' and (n<1 or n>1000 or n<>round(n,2))) then return false; end if;
    elsif complete then return false;
    end if;
  end loop;
  for item in select jsonb_array_elements(p->'work') loop
    if jsonb_typeof(item)<>'object'
       or jsonb_typeof(item->'title') is distinct from 'string'
       or jsonb_typeof(item->'credit') is distinct from 'string'
       or length(item->>'title')>100 or length(item->>'credit')>200 then return false; end if;
    if coalesce(item->>'url','')<>'' and
       (item->>'url' !~* '^https://(open\.spotify\.com|music\.apple\.com|([a-z0-9-]+\.)?soundcloud\.com|youtu\.be|([a-z0-9-]+\.)?youtube\.com|([a-z0-9-]+\.)?bandcamp\.com)/' or length(item->>'url')>2000) then return false; end if;
    if coalesce(item->>'audio_path','')<>'' and
       (split_part(item->>'audio_path','/',1)<>owner_id::text or item->>'audio_path' !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(wav|mp3|m4a|aac|flac|ogg)$') then return false; end if;
    if complete and (length(trim(item->>'title'))=0 or length(trim(item->>'credit'))=0
       or (coalesce(item->>'url','')='' and coalesce(item->>'audio_path','')='')) then return false; end if;
  end loop;
  if complete and (length(trim(p->>'name'))=0 or length(trim(p->>'headline'))=0
     or length(trim(p->>'bio'))=0 or length(trim(p->>'service'))=0 or length(trim(p->>'scope'))=0
     or jsonb_array_length(p->'genres')=0 or jsonb_array_length(p->'work')=0) then return false; end if;
  return true;
exception when others then return false;
end;
$$;

create table public.sa_pro_profile_drafts(
  owner_id uuid primary key references auth.users(id),
  profile jsonb not null,
  review_status text not null default 'draft' check(review_status in ('draft','pending')),
  row_version integer not null default 1 check(row_version>0),
  updated_at timestamptz not null default now(),
  check(public.sa_valid_pro_profile(profile,owner_id,review_status='pending'))
);
create table public.sa_pro_public_profiles(
  owner_id uuid primary key references auth.users(id),
  profile jsonb not null,
  approved_at timestamptz not null default now(),
  is_listed boolean not null default true,
  check(public.sa_valid_pro_profile(profile,owner_id,true))
);
alter table public.sa_pro_profile_drafts enable row level security;
alter table public.sa_pro_public_profiles enable row level security;
revoke all on public.sa_pro_profile_drafts,public.sa_pro_public_profiles from anon,authenticated;
grant select,insert,update on public.sa_pro_profile_drafts to authenticated;
grant select on public.sa_pro_public_profiles to anon,authenticated;
create policy sa_pro_draft_owner on public.sa_pro_profile_drafts for all to authenticated
using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy sa_pro_approved_read on public.sa_pro_public_profiles for select to anon,authenticated using(is_listed);

create function public.sa_pro_draft_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.owner_id<>old.owner_id or new.row_version<>old.row_version+1 then raise exception 'Refresh your profile before saving changes'; end if;
  new.updated_at:=now();
  return new;
end;
$$;
create trigger sa_pro_draft_guard before update on public.sa_pro_profile_drafts for each row execute function public.sa_pro_draft_guard();
revoke execute on function public.sa_pro_draft_guard() from public,anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('sa-pro-samples','sa-pro-samples',false,52428800,array['audio/wav','audio/mpeg','audio/mp4','audio/aac','audio/flac','audio/ogg']);
create policy sa_pro_sample_read on storage.objects for select to anon,authenticated using(
  bucket_id='sa-pro-samples' and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or exists(select 1 from public.sa_pro_public_profiles p,
      jsonb_array_elements(p.profile->'work') w
      where w->>'audio_path'=storage.objects.name)
  )
);
create policy sa_pro_sample_upload on storage.objects for insert to authenticated with check(
  bucket_id='sa-pro-samples' and (storage.foldername(name))[1]=(select auth.uid())::text
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(wav|mp3|m4a|aac|flac|ogg)$'
);
create policy sa_pro_sample_cleanup on storage.objects for delete to authenticated using(
  bucket_id='sa-pro-samples' and (storage.foldername(name))[1]=(select auth.uid())::text
  and not exists(select 1 from public.sa_pro_public_profiles p,jsonb_array_elements(p.profile->'work') w where w->>'audio_path'=storage.objects.name)
  and not exists(select 1 from public.sa_pro_profile_drafts d,jsonb_array_elements(d.profile->'work') w where w->>'audio_path'=storage.objects.name)
);

create schema sa_profile_private;
revoke all on schema sa_profile_private from public,anon,authenticated;
grant usage on schema sa_profile_private to authenticated;
create function sa_profile_private.request_quote(p_pro uuid,p_request uuid,p_brief jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); professional_email text; published jsonb; existing public.sa_market_projects;
begin
  if actor is null or actor=p_pro then raise exception 'Sign in as the artist to request a quote'; end if;
  select profile into published from public.sa_pro_public_profiles where owner_id=p_pro and is_listed;
  if published is null then raise exception 'This professional is not available for bookings'; end if;
  select lower(email) into professional_email from auth.users where id=p_pro and email_confirmed_at is not null and (banned_until is null or banned_until<now());
  if professional_email is null then raise exception 'This professional is not available for bookings'; end if;
  if jsonb_typeof(p_brief) is distinct from 'object' or octet_length(p_brief::text)>10000 or length(trim(coalesce(p_brief->>'name',''))) not between 1 and 100
     or length(trim(coalesce(p_brief->>'brief',''))) not between 1 and 2000 then raise exception 'Complete the project name and brief'; end if;
  select * into existing from public.sa_market_projects where id=p_request;
  if existing.id is not null then
    if existing.artist_id=actor and existing.pro_email=professional_email then return existing.id; end if;
    raise exception 'Choose a new request ID';
  end if;
  insert into public.sa_market_projects(id,artist_id,pro_email,name,brief)
  values(p_request,actor,professional_email,p_brief->>'name',
    p_brief||jsonb_build_object('professional_id',p_pro,'professional_name',published->>'name','package',jsonb_build_object('service',published->'service','scope',published->'scope','price',published->'price','days',published->'days','revisions',published->'revisions','hourly',published->'hourly')));
  return p_request;
end;
$$;
revoke execute on function sa_profile_private.request_quote(uuid,uuid,jsonb) from public,anon;
grant execute on function sa_profile_private.request_quote(uuid,uuid,jsonb) to authenticated;
create function public.sa_request_profile_quote(p_pro uuid,p_request uuid,p_brief jsonb)
returns uuid language sql security invoker set search_path='' as $$
  select sa_profile_private.request_quote(p_pro,p_request,p_brief);
$$;
revoke execute on function public.sa_request_profile_quote(uuid,uuid,jsonb) from public,anon;
grant execute on function public.sa_request_profile_quote(uuid,uuid,jsonb) to authenticated;
commit;
