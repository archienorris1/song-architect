begin;
alter policy sa_audio_read on storage.objects
using(bucket_id='sa-project-audio' and exists(
  select 1 from public.sa_market_projects p where p.id::text=(storage.foldername(storage.objects.name))[1]
));
alter policy sa_audio_upload on storage.objects
with check(bucket_id='sa-project-audio'
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(wav|mp3|m4a|aac|flac|ogg)$'
  and exists(select 1 from public.sa_market_projects p
    where p.id::text=(storage.foldername(storage.objects.name))[1]
    and p.pro_email=lower((select auth.jwt()->>'email'))
    and p.status in ('active','review')));
alter policy sa_audio_cleanup on storage.objects
using(bucket_id='sa-project-audio'
  and exists(select 1 from public.sa_market_projects p
    where p.id::text=(storage.foldername(storage.objects.name))[1] and p.pro_email=lower((select auth.jwt()->>'email')))
  and not exists(select 1 from public.sa_market_versions v where v.storage_path=storage.objects.name));
commit;
