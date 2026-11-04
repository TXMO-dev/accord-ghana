-- Public profile invalidation only: never broadcast unpublished profile text.
begin;
create or replace function public.accord_profiles_notify()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform realtime.send(jsonb_build_object('changed',true),'profiles_changed',
 'accord:profiles:'||coalesce(new.network,old.network),false);
 return null;
end;
$$;
revoke all on function public.accord_profiles_notify() from public,anon,authenticated;
drop trigger if exists accord_profiles_notice on public.accord_lounge_profiles;
create trigger accord_profiles_notice after insert or update or delete
on public.accord_lounge_profiles for each row execute function public.accord_profiles_notify();
commit;
-- Expect one row, enabled = O.
select tgname,tgenabled as enabled from pg_trigger
where tgrelid='public.accord_lounge_profiles'::regclass and tgname='accord_profiles_notice';
