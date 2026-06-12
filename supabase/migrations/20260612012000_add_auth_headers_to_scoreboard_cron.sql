-- Recreate scoreboard cron jobs with Edge Function auth headers.
do $$
declare
  job_id bigint;
begin
  select jobid into job_id from cron.job where jobname = 'atualizar-placares-every-minute';
  if job_id is not null then
    perform cron.unschedule(job_id);
  end if;

  select jobid into job_id from cron.job where jobname = 'atualizar-placares-seed-daily';
  if job_id is not null then
    perform cron.unschedule(job_id);
  end if;
end $$;

select cron.schedule(
  'atualizar-placares-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://zqzhsxfsjqrskxmfpdfz.supabase.co/functions/v1/atualizar-placares',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_lyT42yNUnvfoqakfuQp9Mw_q4zPcrh9',
      'Authorization', 'Bearer sb_publishable_lyT42yNUnvfoqakfuQp9Mw_q4zPcrh9'
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'atualizar-placares-seed-daily',
  '0 0 * * *',
  $$
  select net.http_post(
    url := 'https://zqzhsxfsjqrskxmfpdfz.supabase.co/functions/v1/atualizar-placares?seed=true',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_lyT42yNUnvfoqakfuQp9Mw_q4zPcrh9',
      'Authorization', 'Bearer sb_publishable_lyT42yNUnvfoqakfuQp9Mw_q4zPcrh9'
    ),
    body := '{}'::jsonb
  );
  $$
);