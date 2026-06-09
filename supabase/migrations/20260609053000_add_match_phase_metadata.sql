-- Store tournament metadata returned by football-data.org so the app can
-- organize all 104 World Cup matches, not only the group stage.
alter table public.partidas
  add column if not exists fase text,
  add column if not exists grupo text,
  add column if not exists rodada integer;

create index if not exists partidas_fase_inicia_em_idx
  on public.partidas (fase, inicia_em);

create index if not exists partidas_grupo_inicia_em_idx
  on public.partidas (grupo, inicia_em);
