-- Catalogo de selecoes sincronizado pela football-data.org.
create table if not exists public.selecoes (
  id text primary key,
  football_data_id integer generated always as (id::integer) stored,
  nome text not null,
  nome_curto text,
  sigla text,
  area_id integer,
  area_nome text,
  area_codigo text,
  area_bandeira text,
  escudo_url text,
  endereco text,
  site text,
  fundada integer,
  cores text,
  tecnico_nome text,
  tecnico_nacionalidade text,
  tecnico_data_nascimento date,
  elenco jsonb not null default '[]'::jsonb,
  staff jsonb not null default '[]'::jsonb,
  competicoes jsonb not null default '[]'::jsonb,
  api_payload jsonb not null default '{}'::jsonb,
  ultima_atualizacao timestamptz,
  atualizado_em timestamptz not null default now(),
  constraint selecoes_id_numeric check (id ~ '^[0-9]+$')
);

create unique index if not exists selecoes_football_data_id_key
  on public.selecoes (football_data_id);

create index if not exists selecoes_nome_idx
  on public.selecoes (nome);

create index if not exists selecoes_sigla_idx
  on public.selecoes (sigla);

alter table public.selecoes enable row level security;

grant select on public.selecoes to authenticated;
grant all on public.selecoes to service_role;

drop policy if exists selecoes_leitura on public.selecoes;
create policy selecoes_leitura
  on public.selecoes
  for select
  to authenticated
  using (true);

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'selecoes'
  ) then
    alter publication supabase_realtime add table public.selecoes;
  end if;
end $$;
