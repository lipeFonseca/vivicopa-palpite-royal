-- Keep the Supabase cron jobs represented in source control.
-- These jobs call the public Edge Function that syncs World Cup matches.
create extension if not exists pg_cron;
create extension if not exists pg_net;

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
    headers := '{"Content-Type": "application/json"}'::jsonb,
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
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
