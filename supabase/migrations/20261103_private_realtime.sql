-- Read-only private invalidation channel. Broadcast contains no comments or wallet data.
begin;
create policy "Accord room notifications" on realtime.messages for select to authenticated
using (extension='broadcast' and realtime.topic()='accord:'||(auth.jwt()->>'accord_room'));
create or replace function public.accord_notify_room() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform realtime.send(jsonb_build_object('changed',true),'room_changed','accord:'||coalesce(new.room,old.room),true);
 return null;
end $$;
create trigger accord_comment_notice after insert on public.accord_room_comments for each row execute function public.accord_notify_room();
create trigger accord_session_notice after insert or delete on public.accord_room_sessions for each row execute function public.accord_notify_room();
revoke all on function public.accord_notify_room() from public,anon,authenticated;
commit;
