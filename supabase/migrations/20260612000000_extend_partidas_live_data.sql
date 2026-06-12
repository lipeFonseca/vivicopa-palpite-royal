-- Extend partidas with live match data: minute, goals, cards, subs, lineups, stats.
-- All columns nullable; no NOT NULL to avoid backfill issues.
alter table public.partidas
  add column if not exists minuto integer,
  add column if not exists acrescimos integer,
  add column if not exists placar_parcial_a integer,
  add column if not exists placar_parcial_b integer,
  add column if not exists gols jsonb,
  add column if not exists cartoes jsonb,
  add column if not exists substituicoes jsonb,
  add column if not exists escalacao_a jsonb,
  add column if not exists escalacao_b jsonb,
  add column if not exists estatisticas_a jsonb,
  add column if not exists estatisticas_b jsonb,
  add column if not exists fase_polling text,
  add column if not exists ultima_atualizacao_api timestamptz;
