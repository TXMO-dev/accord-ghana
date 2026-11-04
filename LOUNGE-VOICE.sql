-- Accord public Lounge voice notes. Run after existing Lounge SQL.
-- Audio is private Storage data; only the server may upload or issue playback URLs.
begin;
alter table public.accord_lounge_messages add column if not exists voice_seconds double precision check(voice_seconds>0 and voice_seconds<=30);
create table if not exists public.accord_lounge_voice(
 id uuid primary key,
 wallet text not null check(wallet ~ '^G[A-Z2-7]{55}$'),
 seconds double precision not null check(seconds>0 and seconds<=30),
 created_at timestamptz not null default now(),
 published boolean not null default false
);
-- Deliberately no cascading FK: audio cleanup must survive message deletion.
alter table public.accord_lounge_voice enable row level security;
revoke all on public.accord_lounge_voice from public,anon,authenticated;
grant select,insert,update,delete on public.accord_lounge_voice to service_role;
create index if not exists accord_lounge_voice_cleanup on public.accord_lounge_voice(created_at);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('accord-lounge-voice','accord-lounge-voice',false,960044,array['audio/wav'])
on conflict(id) do update set public=false,file_size_limit=960044,allowed_mime_types=array['audio/wav'];
-- Restrictive policies protect this bucket even if another bucket has broad policies.
drop policy if exists accord_voice_server_only on storage.objects;
create policy accord_voice_server_only on storage.objects as restrictive for all to anon,authenticated
using(bucket_id<>'accord-lounge-voice') with check(bucket_id<>'accord-lounge-voice');
commit;
-- Expect false, false, false.
select has_table_privilege('anon','public.accord_lounge_voice','SELECT') as public_can_read_uploads,
has_table_privilege('authenticated','public.accord_lounge_voice','INSERT') as browser_can_upload,
(select public from storage.buckets where id='accord-lounge-voice') as audio_bucket_is_public;
-- Storage deletion is performed by the authenticated daily Vercel cleanup job,
-- using the Storage API, never by deleting storage.objects in SQL.
