-- Track when each match row was last fetched from football-data.org.
alter table public.partidas
  add column if not exists ultima_busca_api timestamptz;

create index if not exists partidas_ultima_busca_api_idx
  on public.partidas (ultima_busca_api);