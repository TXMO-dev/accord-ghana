-- Live Lounge motion: latest position only; existing presence expiry applies.
begin;
alter table public.accord_lounge_presence add column if not exists pose jsonb;
alter table public.accord_lounge_presence add column if not exists motion_at timestamptz;
alter table public.accord_lounge_presence add column if not exists motion_sequence bigint not null default 0;
create or replace function public.accord_lounge_move(session_id uuid,owner_wallet text,next_sequence bigint,next_pose jsonb) returns boolean
language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
 if next_sequence<1 or jsonb_typeof(next_pose)<>'object' then raise exception 'Invalid motion'; end if;
 if next_pose->>'active'='true' then
  if not (next_pose ?& array['x','z','yaw']) or (next_pose->>'x')::numeric not between -31 and -15 or (next_pose->>'z')::numeric not between 11 and 25 or (next_pose->>'yaw')::numeric not between -3.142 and 3.142 then raise exception 'Outside Lounge'; end if;
 elsif next_pose->>'active' is distinct from 'false' then raise exception 'Invalid motion'; end if;
 update public.accord_lounge_presence set pose=next_pose,motion_at=clock_timestamp(),motion_sequence=next_sequence,seen_at=clock_timestamp()
 where id=session_id and wallet=owner_wallet and not departed and expires_at>clock_timestamp()
 and motion_sequence<next_sequence and (motion_at is null or motion_at<clock_timestamp()-interval '400 milliseconds');
 get diagnostics changed=row_count;return changed=1;
end; $$;
revoke all on function public.accord_lounge_move(uuid,text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.accord_lounge_move(uuid,text,bigint,jsonb) to service_role;
commit;
-- Expect true, false, false.
select exists(select 1 from information_schema.columns where table_name='accord_lounge_presence' and column_name='pose' and table_schema='public') as motion_ready,
 has_function_privilege('anon','public.accord_lounge_move(uuid,text,bigint,jsonb)','EXECUTE') as public_can_move,
 has_function_privilege('authenticated','public.accord_lounge_move(uuid,text,bigint,jsonb)','EXECUTE') as browser_can_move;
