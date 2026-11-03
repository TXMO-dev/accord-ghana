-- Private room storage. Only Accord's server can call these functions.
begin;
create table if not exists public.accord_rooms (
 id text primary key, client text not null, freelancer text not null, created_at timestamptz not null default now()
);
create table if not exists public.accord_room_nonces (id text primary key, created_at timestamptz not null default now());
create table if not exists public.accord_room_sessions (
 token text primary key, room text not null references public.accord_rooms(id), wallet text not null,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '30 minutes',
 seen_at timestamptz not null default now(), station integer not null default 0
);
create table if not exists public.accord_room_comments (
 id uuid primary key, room text not null references public.accord_rooms(id), wallet text not null,
 body text not null check(char_length(body) between 1 and 1500), created_at timestamptz not null default now()
);
create index if not exists accord_comments_room_time on public.accord_room_comments(room,created_at);
create index if not exists accord_sessions_wallet_time on public.accord_room_sessions(wallet,created_at);
alter table public.accord_rooms enable row level security;
alter table public.accord_room_nonces enable row level security;
alter table public.accord_room_sessions enable row level security;
alter table public.accord_room_comments enable row level security;
revoke all on public.accord_rooms,public.accord_room_nonces,public.accord_room_sessions,public.accord_room_comments from anon,authenticated;

create or replace function public.accord_room_join(p_nonce text,p_room text,p_wallet text,p_client text,p_freelancer text,p_token text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_wallet,0));
 if p_wallet not in (p_client,p_freelancer) then raise exception 'Not a participant'; end if;
 if (select count(*) from accord_room_sessions where wallet=p_wallet and created_at>now()-interval '1 minute')>=5 then raise exception 'Too many joins'; end if;
 delete from accord_room_nonces where created_at<now()-interval '10 minutes';
 delete from accord_room_sessions where expires_at<now();
 insert into accord_room_nonces(id) values(p_nonce); -- Unique constraint makes replay consumption atomic.
 insert into accord_rooms(id,client,freelancer) values(p_room,p_client,p_freelancer) on conflict do nothing;
 if not exists(select 1 from accord_rooms where id=p_room and client=p_client and freelancer=p_freelancer) then raise exception 'Participants changed'; end if;
 insert into accord_room_sessions(token,room,wallet) values(p_token,p_room,p_wallet);
 return true;
end $$;

create or replace function public.accord_room_request(p_token text,p_action text,p_text text default null,p_message uuid default null,p_station integer default 0)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare s accord_room_sessions; messages jsonb; people jsonb;
begin
 select * into s from accord_room_sessions where token=p_token and expires_at>now() for update;
 if not found then raise exception 'Session expired'; end if;
 if not exists(select 1 from accord_rooms where id=s.room and s.wallet in (client,freelancer)) then raise exception 'Not a participant'; end if;
 if p_action='leave' then delete from accord_room_sessions where token=p_token;return '{"left":true}'::jsonb; end if;
 if p_action not in ('poll','comment') then raise exception 'Invalid action'; end if;
 if p_action='comment' then
  perform pg_advisory_xact_lock(hashtextextended(s.wallet,1));
  if not exists(select 1 from accord_room_comments where id=p_message and room=s.room and wallet=s.wallet) then
   if (select count(*) from accord_room_comments where wallet=s.wallet and created_at>now()-interval '1 minute')>=12 then raise exception 'Comment limit reached'; end if;
   insert into accord_room_comments(id,room,wallet,body) values(p_message,s.room,s.wallet,p_text);
  end if;
 end if;
 update accord_room_sessions set seen_at=now(),station=greatest(0,least(3,p_station)) where token=p_token;
 select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at,c.id),'[]'::jsonb) into messages from
  (select id,wallet,body,created_at from accord_room_comments where room=s.room order by created_at desc,id desc limit 100) c;
 select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) into people from
  (select distinct on (wallet) wallet,station,seen_at from accord_room_sessions where room=s.room and expires_at>now() and seen_at>now()-interval '40 seconds' order by wallet,seen_at desc) p;
 return jsonb_build_object('comments',messages,'participants',people,'checkedAt',now());
end $$;
revoke all on function public.accord_room_join(text,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.accord_room_request(text,text,text,uuid,integer) from public,anon,authenticated;
grant execute on function public.accord_room_join(text,text,text,text,text,text) to service_role;
grant execute on function public.accord_room_request(text,text,text,uuid,integer) to service_role;
commit;
