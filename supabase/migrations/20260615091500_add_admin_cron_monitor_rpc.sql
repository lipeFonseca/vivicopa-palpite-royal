create or replace function public.admin_cron_monitor()
returns jsonb
language plpgsql
security definer
set search_path = public, cron
as $$
declare
  payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sessao invalida';
  end if;

  if not app_private.is_admin(auth.uid()) then
    raise exception 'Acesso negado: apenas admins podem monitorar o cron';
  end if;

  select jsonb_build_object(
    'generated_at',
    timezone('utc', now()),
    'jobs',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'jobid', j.jobid,
          'jobname', j.jobname,
          'schedule', j.schedule,
          'active', j.active,
          'last_status', lr.status,
          'last_start_time', lr.start_time,
          'last_end_time', lr.end_time,
          'last_return_message', lr.return_message
        )
        order by j.jobname
      )
      from cron.job j
      left join lateral (
        select
          d.status,
          d.start_time,
          d.end_time,
          d.return_message
        from cron.job_run_details d
        where d.jobid = j.jobid
        order by d.start_time desc
        limit 1
      ) lr on true
      where j.jobname in (
        'atualizar-placares-every-minute',
        'atualizar-placares-fast-live-offset-30s',
        'atualizar-placares-seed-daily'
      )
    ), '[]'::jsonb),
    'runs',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'jobid', r.jobid,
          'runid', r.runid,
          'status', r.status,
          'return_message', r.return_message,
          'start_time', r.start_time,
          'end_time', r.end_time,
          'command', r.command
        )
        order by r.start_time desc
      )
      from (
        select
          jobid,
          runid,
          status,
          return_message,
          start_time,
          end_time,
          command
        from cron.job_run_details
        where command like '%atualizar-placares%'
        order by start_time desc
        limit 20
      ) r
    ), '[]'::jsonb),
    'last_24h',
    (
      select jsonb_build_object(
        'total', count(*),
        'succeeded', count(*) filter (where lower(coalesce(status, '')) = 'succeeded'),
        'failed', count(*) filter (where lower(coalesce(status, '')) <> 'succeeded')
      )
      from cron.job_run_details
      where command like '%atualizar-placares%'
        and start_time >= now() - interval '24 hours'
    ),
    'partidas_status',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'status', p.status,
          'total', p.total
        )
        order by p.status
      )
      from (
        select status, count(*) as total
        from public.partidas
        group by status
      ) p
    ), '[]'::jsonb),
    'sync_state',
    (
      select jsonb_build_object(
        'ultima_busca', s.ultima_busca,
        'atualizado_em', s.atualizado_em
      )
      from public.api_sync_state s
      where s.chave = 'football_data:scheduled:wc'
      limit 1
    )
  )
  into payload;

  return payload;
end;
$$;

revoke all on function public.admin_cron_monitor() from public;
grant execute on function public.admin_cron_monitor() to authenticated;
