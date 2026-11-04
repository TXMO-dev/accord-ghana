-- Wallet-verified Lounge presence. Only the Accord server can read/write sessions.
begin;
create table if not exists public.accord_lounge_presence(
 id uuid primary key,wallet text not null check(wallet ~ '^G[A-Z2-7]{55}$'),
 display_name text not null check(char_length(display_name) between 1 and 60),
 seen_at timestamptz not null default now(), expires_at timestamptz not null,
 departed boolean not null default false
);
alter table public.accord_lounge_presence enable row level security;
revoke all on public.accord_lounge_presence from public,anon,authenticated;
grant select,insert,update,delete on public.accord_lounge_presence to service_role;
create index if not exists accord_presence_expiry on public.accord_lounge_presence(expires_at);
create or replace function public.accord_presence_notify() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform realtime.send('{"changed":true}'::jsonb,'presence_changed','accord:presence:testnet',false);
 return null;
end; $$;
revoke all on function public.accord_presence_notify() from public,anon,authenticated;
drop trigger if exists accord_presence_notice on public.accord_lounge_presence;
create trigger accord_presence_notice after insert or update or delete on public.accord_lounge_presence
for each row execute function public.accord_presence_notify();
commit;
-- pg_cron was installed for Lounge cleanup. Keep expired sessions only until this job runs.
select cron.schedule('accord-lounge-presence-cleanup','*/5 * * * *',
 $$delete from public.accord_lounge_presence where expires_at<=now();$$);
-- Expect false, false and one active cleanup job below.
select has_table_privilege('anon','public.accord_lounge_presence','SELECT') as public_can_read_sessions,
has_table_privilege('authenticated','public.accord_lounge_presence','INSERT') as client_can_join_directly;
select jobname,active from cron.job where jobname='accord-lounge-presence-cleanup';
