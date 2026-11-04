-- ACCORD: OPT-IN PUBLIC PROFILES
-- Run in Supabase SQL Editor. Public profiles persist until owner removal.
begin;
create table if not exists public.accord_lounge_profiles(
 network text not null default 'testnet' check(network in ('testnet','mainnet')),
 wallet text not null check(wallet ~ '^G[A-Z2-7]{55}$'),
 revision integer not null default 0 check(revision>=0),
 published boolean not null default false,
 hidden boolean not null default false,
 display_name text, intro text, skills text, availability text,
 updated_at timestamptz not null default now(),
 primary key(network,wallet),
 check((not published and display_name is null and intro is null and skills is null and availability is null)
 or (published and display_name is not null and char_length(btrim(display_name)) between 1 and 60
 and intro is not null and char_length(btrim(intro)) between 1 and 280
 and skills is not null and char_length(btrim(skills)) between 1 and 120
 and availability is not null and availability in ('Available for work','Hiring','Open to collaboration','Not currently available')))
);
alter table public.accord_lounge_profiles enable row level security;
revoke all on public.accord_lounge_profiles from public,anon,authenticated;
grant select on public.accord_lounge_profiles to anon,authenticated;
grant select,insert,update,delete on public.accord_lounge_profiles to service_role;
drop policy if exists "Visible lounge profiles" on public.accord_lounge_profiles;
create policy "Visible lounge profiles" on public.accord_lounge_profiles for select to anon,authenticated using(published and not hidden);
create or replace function public.accord_lounge_profile_write(
 target_wallet text,expected_revision integer,remove_profile boolean,
 profile_name text,profile_intro text,profile_skills text,profile_availability text)
returns integer language plpgsql security invoker set search_path='' as $$
declare current_row public.accord_lounge_profiles;
begin
 if remove_profile is null then raise exception 'Choose a profile action'; end if;
 insert into public.accord_lounge_profiles(network,wallet) values('testnet',target_wallet) on conflict do nothing;
 select * into current_row from public.accord_lounge_profiles where network='testnet' and wallet=target_wallet for update;
 if expected_revision is null or current_row.revision<>expected_revision then raise exception 'Stale approval'; end if;
 if not remove_profile and current_row.revision>0 and current_row.updated_at>now()-interval '30 seconds' then raise exception 'Wait before updating'; end if;
 update public.accord_lounge_profiles set
 revision=revision+1,published=not remove_profile,
 display_name=case when remove_profile then null else profile_name end,
 intro=case when remove_profile then null else profile_intro end,
 skills=case when remove_profile then null else profile_skills end,
 availability=case when remove_profile then null else profile_availability end,
 updated_at=now()
 where network='testnet' and wallet=target_wallet;
 -- Preserve hidden moderation flag across edits; only moderators can restore it.
 return current_row.revision+1;
end;
$$;
revoke all on function public.accord_lounge_profile_write(text,integer,boolean,text,text,text,text) from public,anon,authenticated;
grant execute on function public.accord_lounge_profile_write(text,integer,boolean,text,text,text,text) to service_role;
commit;

-- Expect true, false, false.
select has_table_privilege('anon','public.accord_lounge_profiles','SELECT') as public_can_read,
 has_table_privilege('authenticated','public.accord_lounge_profiles','UPDATE') as client_can_edit,
 has_function_privilege('anon','public.accord_lounge_profile_write(text,integer,boolean,text,text,text,text)','EXECUTE') as public_can_write;
