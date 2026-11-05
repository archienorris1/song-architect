begin;

create table public.sa_market_projects (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references auth.users(id),
  pro_email text not null check (pro_email = lower(trim(pro_email)) and pro_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  name text not null check (length(trim(name)) between 1 and 100),
  brief jsonb not null check (jsonb_typeof(brief) = 'object' and octet_length(brief::text) <= 12000),
  quote jsonb,
  status text not null default 'brief' check (status in ('brief','quoted','active','review','complete')),
  revision_requests integer not null default 0 check (revision_requests >= 0),
  row_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sa_market_projects_artist on public.sa_market_projects(artist_id);
create index sa_market_projects_email on public.sa_market_projects(pro_email);

create table public.sa_market_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sa_market_projects(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  name text not null check (length(trim(name)) between 1 and 100),
  url text not null check (url ~ '^https://' and length(url) <= 2000),
  notes text not null check (length(trim(notes)) between 1 and 2000),
  created_at timestamptz not null default now(),
  unique(project_id,id)
);
create index sa_market_versions_project on public.sa_market_versions(project_id);

create table public.sa_market_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sa_market_projects(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  sender_role text not null check (sender_role in ('artist','pro')),
  body text not null check (length(trim(body)) between 1 and 4000),
  version_id uuid,
  seconds integer check (seconds between 0 and 86400),
  created_at timestamptz not null default now(),
  foreign key (project_id,version_id) references public.sa_market_versions(project_id,id),
  check ((version_id is null and seconds is null) or (version_id is not null and seconds is not null))
);
create index sa_market_messages_project on public.sa_market_messages(project_id);

alter table public.sa_market_projects enable row level security;
alter table public.sa_market_versions enable row level security;
alter table public.sa_market_messages enable row level security;
revoke all on public.sa_market_projects, public.sa_market_versions, public.sa_market_messages from anon, authenticated;
grant select,insert,update on public.sa_market_projects to authenticated;
grant select on public.sa_market_versions, public.sa_market_messages to authenticated;
grant insert(id,project_id,author_id,name,url,notes) on public.sa_market_versions to authenticated;
grant insert(id,project_id,author_id,sender_role,body,version_id,seconds) on public.sa_market_messages to authenticated;

create policy sa_project_read on public.sa_market_projects for select to authenticated
using (artist_id = (select auth.uid()) or pro_email = lower((select auth.jwt()->>'email')));
create policy sa_project_create on public.sa_market_projects for insert to authenticated
with check (artist_id = (select auth.uid()) and pro_email <> lower((select auth.jwt()->>'email')) and status='brief' and quote is null and revision_requests=0 and row_version=1);
create policy sa_project_change on public.sa_market_projects for update to authenticated
using (artist_id = (select auth.uid()) or pro_email = lower((select auth.jwt()->>'email')))
with check (artist_id = (select auth.uid()) or pro_email = lower((select auth.jwt()->>'email')));

create policy sa_version_read on public.sa_market_versions for select to authenticated
using (exists(select 1 from public.sa_market_projects p where p.id=project_id));
create policy sa_version_create on public.sa_market_versions for insert to authenticated
with check (author_id=(select auth.uid()) and exists(select 1 from public.sa_market_projects p where p.id=project_id and p.pro_email=lower((select auth.jwt()->>'email')) and p.status in ('active','review')));
create policy sa_message_read on public.sa_market_messages for select to authenticated
using (exists(select 1 from public.sa_market_projects p where p.id=project_id));
create policy sa_message_create on public.sa_market_messages for insert to authenticated
with check (author_id=(select auth.uid()) and exists(select 1 from public.sa_market_projects p where p.id=project_id and ((sender_role='artist' and p.artist_id=(select auth.uid())) or (sender_role='pro' and p.pro_email=lower((select auth.jwt()->>'email'))))));

create function public.sa_market_validate_project() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  is_artist boolean := old.artist_id = auth.uid();
  is_pro boolean := old.pro_email = lower(auth.jwt()->>'email');
  q jsonb := new.quote;
begin
  if not (coalesce(is_artist,false) or coalesce(is_pro,false)) then
    raise exception 'Project access denied';
  end if;
  if (new.id,new.artist_id,new.pro_email,new.name,new.brief,new.created_at)
     is distinct from (old.id,old.artist_id,old.pro_email,old.name,old.brief,old.created_at) then
    raise exception 'Project participants and brief cannot be reassigned';
  end if;
  if new.row_version <> old.row_version+1 then raise exception 'Reload this project before making changes'; end if;
  if new.quote is distinct from old.quote then
    if not is_pro or old.status not in ('brief','quoted') or new.status<>'quoted' then raise exception 'Only the invited professional can quote before work starts'; end if;
  end if;
  if new.status='quoted' then
    if q is null or jsonb_typeof(q)<>'object' or octet_length(q::text)>16000
       or jsonb_typeof(q->'price') is distinct from 'number'
       or jsonb_typeof(q->'revisions') is distinct from 'number'
       or jsonb_typeof(q->'hourly') is distinct from 'number'
       or (q->>'price')::numeric not between 25 and 50000
       or (q->>'hourly')::numeric not between 1 and 1000
       or (q->>'revisions')::numeric not between 0 and 20
       or (q->>'revisions')::numeric <> trunc((q->>'revisions')::numeric)
       or length(trim(coalesce(q->>'scope',''))) not between 1 and 2000
       or length(trim(coalesce(q->>'rights',''))) not between 1 and 2000
       or coalesce(q->>'date','') !~ '^\d{4}-\d{2}-\d{2}$'
       or (q->>'date')::date < current_date then raise exception 'Complete the price, scope, date, revision and rights fields'; end if;
  end if;
  if new.status is distinct from old.status then
    if not (
      (is_pro and old.status in ('brief','quoted') and new.status='quoted' and new.quote is not null)
      or (is_artist and old.status='quoted' and new.status='active' and new.quote=old.quote)
      or (is_pro and old.status='active' and new.status='review' and exists(select 1 from public.sa_market_versions v where v.project_id=old.id and v.created_at >= old.updated_at))
      or (is_artist and old.status='review' and new.status='active' and new.revision_requests=old.revision_requests+1 and new.revision_requests <= (old.quote->>'revisions')::integer)
      or (is_artist and old.status='review' and new.status='complete')
    ) then raise exception 'This action is not available to your account at this project stage'; end if;
  end if;
  if new.revision_requests is distinct from old.revision_requests and not (is_artist and old.status='review' and new.status='active' and new.revision_requests=old.revision_requests+1 and new.revision_requests <= (old.quote->>'revisions')::integer) then
    raise exception 'Revision limit exceeded';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger sa_market_project_guard before update on public.sa_market_projects
for each row execute function public.sa_market_validate_project();
revoke execute on function public.sa_market_validate_project() from public,anon,authenticated;

-- Delivery and status change commit together, preventing half-finished deliveries.
create function public.sa_market_deliver(p_id uuid,p_version integer,p_delivery_id uuid,p_name text,p_url text,p_notes text)
returns void language plpgsql security invoker set search_path = '' as $$
declare p public.sa_market_projects;
begin
  select * into p from public.sa_market_projects where id=p_id for update;
  if p.id is null or p.pro_email<>lower(auth.jwt()->>'email') then raise exception 'Project access denied'; end if;
  if exists(select 1 from public.sa_market_versions where id=p_delivery_id and project_id=p_id) then return; end if;
  if p.row_version<>p_version or p.status not in ('active','review') then raise exception 'Project changed. Refresh and try again'; end if;
  insert into public.sa_market_versions(id,project_id,author_id,name,url,notes) values(p_delivery_id,p_id,auth.uid(),p_name,p_url,p_notes);
  update public.sa_market_projects set status='review',row_version=row_version+1 where id=p_id;
end;
$$;
revoke execute on function public.sa_market_deliver(uuid,integer,uuid,text,text,text) from public,anon;
grant execute on function public.sa_market_deliver(uuid,integer,uuid,text,text,text) to authenticated;

-- A revision request and its explanatory message also commit together.
create function public.sa_market_revision(p_id uuid,p_version integer,p_message_id uuid,p_body text)
returns void language plpgsql security invoker set search_path = '' as $$
declare p public.sa_market_projects;
begin
  select * into p from public.sa_market_projects where id=p_id for update;
  if p.id is null or p.artist_id<>auth.uid() then raise exception 'Project access denied'; end if;
  if exists(select 1 from public.sa_market_messages where id=p_message_id and project_id=p_id) then return; end if;
  if p.row_version<>p_version or p.status<>'review' then raise exception 'Project changed. Refresh and try again'; end if;
  insert into public.sa_market_messages(id,project_id,author_id,sender_role,body) values(p_message_id,p_id,auth.uid(),'artist',p_body);
  update public.sa_market_projects set status='active',revision_requests=revision_requests+1,row_version=row_version+1 where id=p_id;
end;
$$;
-- Only the RPC may insert a revision message. It uses the same ordinary insert permission as chat.
grant insert(id,project_id,author_id,sender_role,body,version_id,seconds) on public.sa_market_messages to authenticated;
revoke execute on function public.sa_market_revision(uuid,integer,uuid,text) from public,anon;
grant execute on function public.sa_market_revision(uuid,integer,uuid,text) to authenticated;
commit;
