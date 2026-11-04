-- Run in the Accord Supabase SQL Editor. Safe to run again.
-- Existing presence consent, expiry, RLS and realtime trigger remain in force.
begin;
alter table public.accord_lounge_presence add column if not exists avatar jsonb
 check (avatar is null or (jsonb_typeof(avatar)='object' and octet_length(avatar::text)<=2048));
commit;
-- Expect true, false, false.
select exists(select 1 from information_schema.columns where table_schema='public' and table_name='accord_lounge_presence' and column_name='avatar') as avatar_ready,
 has_table_privilege('anon','public.accord_lounge_presence','SELECT') as public_can_read_presence,
 has_table_privilege('authenticated','public.accord_lounge_presence','UPDATE') as browser_can_change_presence;
