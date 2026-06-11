-- Run these queries in the Supabase SQL editor to inspect scheduled jobs.

-- Active cron jobs.
select
  jobid,
  jobname,
  schedule,
  active,
  command
from cron.job
where jobname in (
  'atualizar-placares-every-minute',
  'atualizar-placares-seed-daily'
)
order by jobname;

-- Latest cron executions.
select
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
from cron.job_run_details
where command like '%atualizar-placares%'
order by start_time desc
limit 20;

-- Match sync state.
select
  count(*) as total_partidas,
  min(inicia_em) as primeira_partida,
  max(inicia_em) as ultima_partida
from public.partidas;

select
  status,
  count(*) as total
from public.partidas
group by status
order by status;
