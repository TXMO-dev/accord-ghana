-- Run the entire file in Accord's Supabase SQL Editor after private rooms exist.
-- Discussion approvals only: no escrow terms, balances or Stellar data change.
begin;
create table if not exists public.accord_scope_proposals (
 id uuid primary key, room text not null references public.accord_rooms(id),
 version integer not null check(version>0), proposer text not null,
 terms_hash text not null check(terms_hash ~ '^[a-f0-9]{64}$'),
 scope text not null check(char_length(btrim(scope)) between 1 and 2000),
 reason text not null check(char_length(btrim(reason)) between 1 and 400),
 price_effect text not null check(char_length(btrim(price_effect)) between 1 and 200),
 time_effect text not null check(char_length(btrim(time_effect)) between 1 and 200),
 status text not null default 'pending' check(status in ('pending','accepted','rejected','withdrawn')),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '7 days',
 decided_by text, decided_at timestamptz, unique(room,version)
);
alter table public.accord_scope_proposals enable row level security;
revoke all on public.accord_scope_proposals from public,anon,authenticated;
grant select,insert,update on public.accord_scope_proposals to service_role;
grant select,update on public.accord_rooms to service_role;
grant select on public.accord_room_sessions to service_role;
create or replace function public.accord_scope_request(p_token text,p_room text,p_action text,p_id uuid,p_version integer,p_proposal jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare s public.accord_room_sessions; r public.accord_rooms; q public.accord_scope_proposals; latest integer; desired text; history jsonb;
begin
 select * into s from public.accord_room_sessions where token=p_token and room=p_room and expires_at>now();
 if not found then raise exception 'Room session expired'; end if;
 select * into r from public.accord_rooms where id=p_room for update;
 if not found or s.wallet not in (r.client,r.freelancer) then raise exception 'Not a participant'; end if;
 select coalesce(max(version),0) into latest from public.accord_scope_proposals where room=p_room;
 if p_action='create' then
  select * into q from public.accord_scope_proposals where id=p_id;
  if found then
   if q.room<>p_room or q.proposer<>s.wallet or q.version<>p_version+1 or q.terms_hash<>p_proposal->>'termsHash' or q.scope<>p_proposal->>'scope' or q.reason<>p_proposal->>'reason' or q.price_effect<>p_proposal->>'priceEffect' or q.time_effect<>p_proposal->>'timeEffect' then raise exception 'Proposal identifier already used'; end if;
  else
   if p_version is null or p_version<>latest then raise exception 'Proposal history changed. Refresh'; end if;
   if latest>=100 then raise exception 'Proposal history limit reached'; end if;
   if exists(select 1 from public.accord_scope_proposals where room=p_room and status='pending' and expires_at>now()) then raise exception 'Respond to or withdraw the pending proposal first'; end if;
   if (select count(*) from public.accord_scope_proposals where room=p_room and created_at>now()-interval '1 day')>=6 then raise exception 'Daily proposal limit reached'; end if;
   insert into public.accord_scope_proposals(id,room,version,proposer,terms_hash,scope,reason,price_effect,time_effect)
    values(p_id,p_room,latest+1,s.wallet,p_proposal->>'termsHash',p_proposal->>'scope',p_proposal->>'reason',p_proposal->>'priceEffect',p_proposal->>'timeEffect');
  end if;
 elsif p_action in ('accept','reject','withdraw') then
  select * into q from public.accord_scope_proposals where id=p_id and room=p_room;
  if not found then raise exception 'Proposal not found'; end if;
  if (p_action='withdraw' and q.proposer<>s.wallet) or (p_action<>'withdraw' and q.proposer=s.wallet) then raise exception 'This action belongs to the other participant'; end if;
  if p_version is null or p_version<>q.version or q.terms_hash is distinct from p_proposal->>'termsHash' then raise exception 'Proposal or original conditions changed'; end if;
  desired=case p_action when 'accept' then 'accepted' when 'reject' then 'rejected' else 'withdrawn' end;
  if q.status=desired and q.decided_by=s.wallet then null; -- Same response retry is idempotent.
  else
   if q.status<>'pending' or q.version<>latest or q.expires_at<=now() then raise exception 'Proposal is closed, expired or superseded'; end if;
   update public.accord_scope_proposals set status=desired,decided_by=s.wallet,decided_at=now() where id=p_id;
  end if;
 elsif p_action<>'list' then raise exception 'Invalid scope action';
 end if;
 select coalesce(jsonb_agg(to_jsonb(p) order by p.version desc),'[]'::jsonb) into history from public.accord_scope_proposals p where room=p_room;
 return jsonb_build_object('proposals',history);
end $$;
revoke all on function public.accord_scope_request(text,text,text,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.accord_scope_request(text,text,text,uuid,integer,jsonb) to service_role;
commit;
-- Expect true, false, false, false.
select (select relrowsecurity from pg_class where oid='public.accord_scope_proposals'::regclass) as rls_enabled,
 has_table_privilege('anon','public.accord_scope_proposals','SELECT') as public_can_read,
 has_table_privilege('authenticated','public.accord_scope_proposals','UPDATE') as browser_can_update,
 has_function_privilege('authenticated','public.accord_scope_request(text,text,text,uuid,integer,jsonb)','EXECUTE') as browser_can_approve;
