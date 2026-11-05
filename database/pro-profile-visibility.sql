begin;
alter table public.sa_pro_public_profiles add column if not exists is_listed boolean not null default true;
alter policy sa_pro_approved_read on public.sa_pro_public_profiles using(is_listed);
create or replace function sa_profile_private.request_quote(p_pro uuid,p_request uuid,p_brief jsonb)
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
commit;
