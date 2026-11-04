-- Run in Accord's Supabase SQL Editor after LOUNGE-PUBLIC-CHAT.sql.
-- Enable pg_cron in Supabase Integrations > Cron first if unavailable.
-- Deletes expired lounge messages only. Private project rooms are untouched.
begin;
create extension if not exists pg_cron;
select cron.schedule(
  'accord-lounge-expired-messages',
  '*/5 * * * *',
  'select public.accord_lounge_cleanup();'
);
-- Retain seven days of execution history for this job only.
select cron.schedule(
  'accord-lounge-job-history',
  '15 3 * * *',
  $job$delete from cron.job_run_details
    where jobid in (select jobid from cron.job where jobname in
      ('accord-lounge-expired-messages','accord-lounge-job-history'))
    and end_time < now() - interval '7 days';$job$
);
commit;

-- Expect one active cleanup job with the five-minute schedule.
select jobid, jobname, schedule, command, active
from cron.job where jobname = 'accord-lounge-expired-messages';

-- Run again after five minutes: expect a recent succeeded row.
select r.status, r.start_time, r.end_time, r.return_message
from cron.job_run_details r join cron.job j using(jobid)
where j.jobname = 'accord-lounge-expired-messages'
order by r.start_time desc limit 5;

-- After a successful run, expect zero (unless a row has just expired).
select count(*) as expired_rows_remaining
from public.accord_lounge_messages where expires_at <= now();
