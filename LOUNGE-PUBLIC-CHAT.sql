-- ACCORD LOUNGE: public text-chat database foundation.
-- Run this entire script in the accord project's Supabase SQL Editor.
-- Does not alter private project rooms or enable the unfinished public-chat UI.
-- Only the trusted server may write, after verifying wallet ownership,
-- replay protection, rate limits and moderation. Never send its secret key to a browser.
begin;

create table if not exists public.accord_lounge_messages (
  id uuid primary key default gen_random_uuid(),
  network text not null check (network in ('testnet','mainnet')),
  wallet text not null check (wallet ~ '^G[A-Z2-7]{55}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  hidden boolean not null default false,
  constraint accord_lounge_expiry check (expires_at = created_at + interval '24 hours')
);
create index if not exists accord_lounge_feed
  on public.accord_lounge_messages (network, created_at desc) where hidden = false;
create index if not exists accord_lounge_expiry
  on public.accord_lounge_messages (expires_at);

alter table public.accord_lounge_messages enable row level security;
revoke all on public.accord_lounge_messages from public, anon, authenticated;
grant select on public.accord_lounge_messages to anon, authenticated;
grant select, insert, update, delete on public.accord_lounge_messages to service_role;
drop policy if exists "Accord lounge visible messages" on public.accord_lounge_messages;
create policy "Accord lounge visible messages"
  on public.accord_lounge_messages for select to anon, authenticated
  using (not hidden and expires_at > now());

-- Set timestamps in the database, not from client-supplied values.
create or replace function public.accord_lounge_stamp()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.created_at := statement_timestamp();
  new.expires_at := new.created_at + interval '24 hours';
  return new;
end;
$$;
revoke all on function public.accord_lounge_stamp() from public, anon, authenticated;
drop trigger if exists accord_lounge_stamp on public.accord_lounge_messages;
create trigger accord_lounge_stamp before insert on public.accord_lounge_messages
  for each row execute function public.accord_lounge_stamp();

-- Public WebSocket notification contains no message text or wallet data.
-- Clients must refetch visible messages, never trust broadcast content as chat.
create or replace function public.accord_lounge_notify()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  perform realtime.send(
    jsonb_build_object('changed', true),
    'lounge_changed',
    'accord:lounge:' || coalesce(new.network, old.network),
    false
  );
  return null;
end;
$$;
revoke all on function public.accord_lounge_notify() from public, anon, authenticated;
drop trigger if exists accord_lounge_notice on public.accord_lounge_messages;
create trigger accord_lounge_notice after insert or update or delete
  on public.accord_lounge_messages for each row execute function public.accord_lounge_notify();

-- Expired rows are immediately excluded from public reads.
-- Physical deletion needs a scheduled job (separate from visibility expiry).
create or replace function public.accord_lounge_cleanup()
returns bigint language plpgsql security invoker set search_path = '' as $$
declare removed bigint;
begin
  delete from public.accord_lounge_messages where expires_at <= now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.accord_lounge_cleanup() from public, anon, authenticated;
grant execute on function public.accord_lounge_cleanup() to service_role;
commit;

-- Verification: expect rls_enabled=true, public_can_read=true,
-- public_can_post=false, signed_in_can_post=false.
select c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', c.oid, 'SELECT') as public_can_read,
  has_table_privilege('anon', c.oid, 'INSERT') as public_can_post,
  has_table_privilege('authenticated', c.oid, 'INSERT') as signed_in_can_post
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='accord_lounge_messages';
