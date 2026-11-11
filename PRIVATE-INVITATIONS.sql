-- Accord private Testnet invitations. Run the whole script in the SQL Editor.
-- No changes to escrow, existing project rooms, or public chat.
begin;
create table if not exists public.accord_invitations (
 id uuid primary key,
 network text not null default 'testnet' check(network='testnet'),
 client text not null check(client ~ '^G[A-Z2-7]{55}$'),
 recipient text not null check(recipient ~ '^G[A-Z2-7]{55}$' and recipient<>client),
 title text not null check(char_length(btrim(title)) between 1 and 90),
 brief text not null check(char_length(btrim(brief)) between 1 and 600),
 status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
 revision integer not null default 0 check(revision>=0),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '7 days')
);
alter table public.accord_invitations enable row level security;
revoke all on public.accord_invitations from public,anon,authenticated;
grant select,insert,update on public.accord_invitations to service_role;
create index if not exists accord_invitation_client_idx on public.accord_invitations(client,created_at desc);
create index if not exists accord_invitation_recipient_idx on public.accord_invitations(recipient,created_at desc);
create or replace function public.accord_invitation_write(actor text,operation text,target uuid,invite_recipient text,invite_title text,invite_brief text,expected_revision integer)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare row public.accord_invitations; desired text;
begin
 if actor is null or actor !~ '^G[A-Z2-7]{55}$' then raise exception 'Invalid wallet'; end if;
 -- Serialize a sender's create attempts across server instances.
 perform pg_advisory_xact_lock(hashtextextended(actor,0));
 select * into row from public.accord_invitations where id=target for update;
 if operation='create' then
  if row.id is not null then
   if row.client=actor and row.recipient=invite_recipient and row.title=invite_title and row.brief=invite_brief then return to_jsonb(row); end if;
   raise exception 'Invitation slot already used. Wait a minute and review again';
  end if;
  if expected_revision<>0 then raise exception 'Invalid revision'; end if;
  if (select count(*) from public.accord_invitations where client=actor and created_at>now()-interval '1 day')>=10 then raise exception 'Daily invitation limit reached'; end if;
  if exists(select 1 from public.accord_invitations where client=actor and recipient=invite_recipient and status='pending' and expires_at>now()) then raise exception 'Pending invitation already exists'; end if;
  insert into public.accord_invitations(id,client,recipient,title,brief) values(target,actor,invite_recipient,invite_title,invite_brief) returning * into row;
 else
  if row.id is null or (operation='cancel' and row.client<>actor) or (operation in ('accept','decline') and row.recipient<>actor) then raise exception 'Invitation unavailable'; end if;
  desired=case operation when 'accept' then 'accepted' when 'decline' then 'declined' when 'cancel' then 'cancelled' else null end;
  if desired is null then raise exception 'Invalid action'; end if;
  if row.status=desired and row.revision=expected_revision+1 then return to_jsonb(row); end if;
  if row.status<>'pending' or row.revision<>expected_revision or row.expires_at<=now() then raise exception 'Invitation changed or expired'; end if;
  update public.accord_invitations set status=desired,revision=revision+1 where id=target returning * into row;
 end if;
 return to_jsonb(row);
end $$;
revoke all on function public.accord_invitation_write(text,text,uuid,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.accord_invitation_write(text,text,uuid,text,text,text,integer) to service_role;
commit;
-- Expect true, false, false, false.
select (select relrowsecurity from pg_class where oid='public.accord_invitations'::regclass) as rls_enabled,
has_table_privilege('anon','public.accord_invitations','SELECT') as public_can_read,
has_table_privilege('authenticated','public.accord_invitations','SELECT') as browser_can_read,
has_function_privilege('authenticated','public.accord_invitation_write(text,text,uuid,text,text,text,integer)','EXECUTE') as browser_can_write;
