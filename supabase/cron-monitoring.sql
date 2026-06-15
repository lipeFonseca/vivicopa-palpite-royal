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
  'atualizar-placares-fast-live-offset-30s',
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

-- Specific row check for matches that should already be live or updated.
select
  id,
  time_a,
  time_b,
  status,
  placar_a,
  placar_b,
  inicia_em,
  ultima_atualizacao_api,
  atualizado_em
from public.partidas
where (time_a = 'Costa do Marfim' and time_b = 'Equador')
   or (time_a = 'Equador' and time_b = 'Costa do Marfim');

