-- ACCORD LOUNGE REPORTING AND MODERATION
-- Apply after LOUNGE-PUBLIC-CHAT.sql. Safe to rerun.
begin;
create table if not exists public.accord_lounge_reports (
 id uuid primary key,
 message_id uuid not null references public.accord_lounge_messages(id) on delete cascade,
 reporter text not null check (reporter ~ '^G[A-Z2-7]{55}$'),
 reason text not null check (reason in ('Spam','Scam or fraud','Harassment','Inappropriate content')),
 created_at timestamptz not null default now(),
 decision text check (decision in ('hide','dismiss','restore')),
 reviewed_at timestamptz,
 unique(message_id,reporter)
);
alter table public.accord_lounge_reports enable row level security;
revoke all on public.accord_lounge_reports from public,anon,authenticated;
grant select,insert,update,delete on public.accord_lounge_reports to service_role;
create index if not exists accord_lounge_reports_pending
 on public.accord_lounge_reports(created_at) where decision is null;

-- Moderator operation: only the database owner / trusted server can execute.
-- No browser-accessible moderator credentials or automatic report-count bans.
create or replace function public.accord_lounge_moderate(target uuid, action text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if action not in ('hide','dismiss','restore') or action is null then
  raise exception 'Choose hide, dismiss, or restore';
 end if;
 perform 1 from public.accord_lounge_messages where id=target for update;
 if not found then raise exception 'Message no longer exists'; end if;
 if action in ('hide','restore') then
  update public.accord_lounge_messages set hidden=(action='hide') where id=target;
 end if;
 update public.accord_lounge_reports set decision=action,reviewed_at=now() where message_id=target;
end;
$$;
revoke all on function public.accord_lounge_moderate(uuid,text) from public,anon,authenticated;
grant execute on function public.accord_lounge_moderate(uuid,text) to service_role;
commit;

-- Expect all four false. Reports must never be public.
select has_table_privilege('anon','public.accord_lounge_reports','SELECT') as public_can_read_reports,
 has_table_privilege('authenticated','public.accord_lounge_reports','INSERT') as client_can_insert_reports,
 has_function_privilege('anon','public.accord_lounge_moderate(uuid,text)','EXECUTE') as public_can_moderate,
 has_function_privilege('authenticated','public.accord_lounge_moderate(uuid,text)','EXECUTE') as client_can_moderate;
