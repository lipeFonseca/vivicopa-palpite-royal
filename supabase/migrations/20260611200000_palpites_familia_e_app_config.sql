-- ============================================================
-- palpites_familia: palpites + comentarios da familia
-- Substitui o armazenamento em localStorage
-- ============================================================
create table if not exists public.palpites_familia (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references auth.users(id) on delete cascade,
  usuario_nome text not null,
  jogo_id      text not null,
  selecao_a    text not null,
  selecao_b    text not null,
  placar_a     integer not null default 0,
  placar_b     integer not null default 0,
  comentario   text,
  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (usuario_id, jogo_id)
);

alter table public.palpites_familia enable row level security;

-- Todos os membros autenticados podem ler palpites da familia
create policy palpites_familia_leitura
  on public.palpites_familia for select
  to authenticated using (true);

-- Cada um insere apenas o proprio
create policy palpites_familia_insere
  on public.palpites_familia for insert
  to authenticated with check (usuario_id = auth.uid());

-- Cada um edita apenas o proprio
create policy palpites_familia_edita
  on public.palpites_familia for update
  to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- Cada um deleta apenas o proprio
create policy palpites_familia_deleta
  on public.palpites_familia for delete
  to authenticated using (usuario_id = auth.uid());

grant select, insert, update, delete on public.palpites_familia to authenticated;
grant all on public.palpites_familia to service_role;

create index if not exists palpites_familia_usuario_idx
  on public.palpites_familia (usuario_id);

create index if not exists palpites_familia_jogo_idx
  on public.palpites_familia (jogo_id);

-- ============================================================
-- app_config: configuracoes visuais (logo, banner, tamanhos)
-- Substitui o armazenamento em localStorage
-- ============================================================
create table if not exists public.app_config (
  chave        text primary key,
  valor        text,
  atualizado_em timestamptz not null default now()
);

alter table public.app_config enable row level security;

-- Leitura publica: anon e authenticated podem ler (logo aparece antes do login)
create policy app_config_leitura_publica
  on public.app_config for select
  to anon, authenticated using (true);

-- Escrita somente para admin
create policy app_config_escrita_admin
  on public.app_config for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

grant select on public.app_config to anon;
grant select, insert, update, delete on public.app_config to authenticated;
grant all on public.app_config to service_role;

-- Valores padrao
insert into public.app_config (chave, valor) values
  ('logo_url',           ''),
  ('logo_size',          '80'),
  ('logo_header_size',   '36'),
  ('header_banner_url',  '')
on conflict (chave) do nothing;
