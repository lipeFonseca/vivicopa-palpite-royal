-- Restore realtime publication after the clean schema rebuild and add lookup indexes.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create index if not exists partidas_status_inicia_em_idx
  on public.partidas (status, inicia_em);

create index if not exists palpites_usuario_id_idx
  on public.palpites (usuario_id);

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'partidas'
  ) then
    alter publication supabase_realtime add table public.partidas;
  end if;
end $$;
