-- Apply after LOUNGE-MODERATION.sql. No message contents or reporter identities in the audit log.
begin;
create table if not exists public.accord_lounge_moderation_audit (
 approval_id uuid primary key,
 message_id uuid not null,
 moderator text not null check(moderator ~ '^G[A-Z2-7]{55}$'),
 action text not null check(action in ('hide','dismiss','restore')),
 created_at timestamptz not null default now()
);
alter table public.accord_lounge_moderation_audit enable row level security;
revoke all on public.accord_lounge_moderation_audit from public,anon,authenticated;
grant select,insert on public.accord_lounge_moderation_audit to service_role;
create or replace function public.accord_lounge_review(target uuid, decision text, moderator_wallet text, approval uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if decision not in ('hide','dismiss','restore') or decision is null then raise exception 'Invalid decision'; end if;
 perform 1 from public.accord_lounge_messages where id=target and network='testnet' and expires_at>now() for update;
 if not found then raise exception 'Message expired or unavailable'; end if;
 insert into public.accord_lounge_moderation_audit(approval_id,message_id,moderator,action) values(approval,target,moderator_wallet,decision);
 perform public.accord_lounge_moderate(target,decision);
end;
$$;
revoke all on function public.accord_lounge_review(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.accord_lounge_review(uuid,text,text,uuid) to service_role;
commit;
-- Expect false, false. Audit rows persist after message expiry without message content.
select has_table_privilege('anon','public.accord_lounge_moderation_audit','SELECT') as public_can_read_audit,
 has_function_privilege('authenticated','public.accord_lounge_review(uuid,text,text,uuid)','EXECUTE') as browser_can_moderate;
