-- Add a lightweight half-minute live scoreboard refresh.
do $$
declare
  job_id bigint;
begin
  select jobid into job_id from cron.job where jobname = 'atualizar-placares-fast-live-offset-30s';
  if job_id is not null then
    perform cron.unschedule(job_id);
  end if;
end $$;

select cron.schedule(
  'atualizar-placares-fast-live-offset-30s',
  '* * * * *',
  $$
  select pg_sleep(30);
  select net.http_post(
    url := 'https://zqzhsxfsjqrskxmfpdfz.supabase.co/functions/v1/atualizar-placares?mode=fast-live',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_lyT42yNUnvfoqakfuQp9Mw_q4zPcrh9',
      'Authorization', 'Bearer sb_publishable_lyT42yNUnvfoqakfuQp9Mw_q4zPcrh9'
    ),
    body := '{}'::jsonb
  );
  $$
);