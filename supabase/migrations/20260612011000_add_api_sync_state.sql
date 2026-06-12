-- Keep lightweight sync cursors so minute cron jobs do not waste API calls.
create table if not exists public.api_sync_state (
  chave text primary key,
  ultima_busca timestamptz not null,
  atualizado_em timestamptz not null default now()
);

alter table public.api_sync_state enable row level security;