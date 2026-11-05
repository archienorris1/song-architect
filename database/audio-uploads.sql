begin;
alter table public.sa_market_versions add column storage_path text;
alter table public.sa_market_versions alter column url drop not null;
alter table public.sa_market_versions add constraint sa_version_audio_source check (
  (storage_path is null and url is not null)
  or (url is null and storage_path is not null
      and split_part(storage_path,'/',1)=project_id::text
      and storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(wav|mp3|m4a|aac|flac|ogg)$')
);
grant insert(storage_path) on public.sa_market_versions to authenticated;
create index sa_versions_storage_path on public.sa_market_versions(storage_path) where storage_path is not null;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('sa-project-audio','sa-project-audio',false,52428800,
array['audio/wav','audio/mpeg','audio/mp4','audio/aac','audio/flac','audio/ogg']);

create policy sa_audio_read on storage.objects for select to authenticated
using(bucket_id='sa-project-audio' and exists(
  select 1 from public.sa_market_projects p where p.id::text=(storage.foldername(storage.objects.name))[1]
));
create policy sa_audio_upload on storage.objects for insert to authenticated
with check(bucket_id='sa-project-audio'
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(wav|mp3|m4a|aac|flac|ogg)$'
  and exists(select 1 from public.sa_market_projects p
    where p.id::text=(storage.foldername(storage.objects.name))[1]
    and p.pro_email=lower((select auth.jwt()->>'email'))
    and p.status in ('active','review')));
create policy sa_audio_cleanup on storage.objects for delete to authenticated
using(bucket_id='sa-project-audio'
  and exists(select 1 from public.sa_market_projects p
    where p.id::text=(storage.foldername(storage.objects.name))[1] and p.pro_email=lower((select auth.jwt()->>'email')))
  and not exists(select 1 from public.sa_market_versions v where v.storage_path=storage.objects.name));

create function public.sa_market_deliver_upload(p_id uuid,p_version integer,p_delivery_id uuid,p_name text,p_storage_path text,p_notes text)
returns void language plpgsql security invoker set search_path = '' as $$
declare p public.sa_market_projects;
begin
  select * into p from public.sa_market_projects where id=p_id for update;
  if p.id is null or p.pro_email<>lower(auth.jwt()->>'email') then raise exception 'Project access denied'; end if;
  if exists(select 1 from public.sa_market_versions where id=p_delivery_id and project_id=p_id and storage_path=p_storage_path) then return; end if;
  if p.row_version<>p_version or p.status not in ('active','review') then raise exception 'Project changed. Refresh and try again'; end if;
  if split_part(p_storage_path,'/',1)<>p_id::text or not exists(
    select 1 from storage.objects where bucket_id='sa-project-audio' and name=p_storage_path
  ) then raise exception 'The audio upload is not ready. Try again'; end if;
  insert into public.sa_market_versions(id,project_id,author_id,name,url,storage_path,notes)
    values(p_delivery_id,p_id,auth.uid(),p_name,null,p_storage_path,p_notes);
  update public.sa_market_projects set status='review',row_version=row_version+1 where id=p_id;
end;
$$;
revoke execute on function public.sa_market_deliver_upload(uuid,integer,uuid,text,text,text) from public,anon;
grant execute on function public.sa_market_deliver_upload(uuid,integer,uuid,text,text,text) to authenticated;
commit;
