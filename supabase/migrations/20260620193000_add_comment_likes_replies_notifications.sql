-- ============================================================
-- Comentarios escalaveis: respostas rasas, curtidas e notificacoes
-- ============================================================

alter table public.comentarios_jogo
  add column if not exists parent_id uuid null references public.comentarios_jogo(id) on delete cascade;

create index if not exists comentarios_jogo_parent_idx
  on public.comentarios_jogo (parent_id, criado_em asc);

create or replace function public.validar_resposta_comentario_jogo()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  comentario_pai public.comentarios_jogo%rowtype;
begin
  if new.parent_id is null then
    return new;
  end if;

  select *
  into comentario_pai
  from public.comentarios_jogo
  where id = new.parent_id;

  if not found then
    raise exception 'Comentario pai nao encontrado';
  end if;

  if comentario_pai.jogo_id <> new.jogo_id then
    raise exception 'A resposta deve pertencer ao mesmo jogo do comentario original';
  end if;

  if comentario_pai.parent_id is not null then
    raise exception 'Nao e permitido responder uma resposta. Responda apenas comentarios principais.';
  end if;

  return new;
end;
$$;

drop trigger if exists comentarios_jogo_validar_resposta on public.comentarios_jogo;
create trigger comentarios_jogo_validar_resposta
  before insert or update of parent_id, jogo_id on public.comentarios_jogo
  for each row
  execute function public.validar_resposta_comentario_jogo();

create table if not exists public.comentario_curtidas (
  comentario_id uuid not null references public.comentarios_jogo(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (comentario_id, usuario_id)
);

alter table public.comentario_curtidas enable row level security;

create policy comentario_curtidas_leitura
  on public.comentario_curtidas for select
  to authenticated using (true);

create policy comentario_curtidas_insere
  on public.comentario_curtidas for insert
  to authenticated
  with check (usuario_id = auth.uid());

create policy comentario_curtidas_remove
  on public.comentario_curtidas for delete
  to authenticated
  using (usuario_id = auth.uid());

grant select, insert, delete on public.comentario_curtidas to authenticated;
grant all on public.comentario_curtidas to service_role;

create index if not exists comentario_curtidas_usuario_idx
  on public.comentario_curtidas (usuario_id, criado_em desc);

create table if not exists public.notificacoes_usuario (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('comentario_resposta')),
  usuario_destino_id uuid not null references auth.users(id) on delete cascade,
  usuario_origem_id uuid not null references auth.users(id) on delete cascade,
  comentario_id uuid not null references public.comentarios_jogo(id) on delete cascade,
  comentario_pai_id uuid not null references public.comentarios_jogo(id) on delete cascade,
  jogo_id text not null,
  lida_em timestamptz null,
  criado_em timestamptz not null default now(),
  unique (tipo, comentario_id, usuario_destino_id)
);

alter table public.notificacoes_usuario enable row level security;

create policy notificacoes_usuario_leitura
  on public.notificacoes_usuario for select
  to authenticated
  using (usuario_destino_id = auth.uid());

create policy notificacoes_usuario_atualiza
  on public.notificacoes_usuario for update
  to authenticated
  using (usuario_destino_id = auth.uid())
  with check (usuario_destino_id = auth.uid());

grant select, update (lida_em) on public.notificacoes_usuario to authenticated;
grant all on public.notificacoes_usuario to service_role;

create index if not exists notificacoes_usuario_destino_idx
  on public.notificacoes_usuario (usuario_destino_id, criado_em desc);

create index if not exists notificacoes_usuario_destino_lida_idx
  on public.notificacoes_usuario (usuario_destino_id, lida_em, criado_em desc);

create or replace function public.criar_notificacao_resposta_comentario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  comentario_pai public.comentarios_jogo%rowtype;
begin
  if new.parent_id is null then
    return new;
  end if;

  select *
  into comentario_pai
  from public.comentarios_jogo
  where id = new.parent_id;

  if not found then
    return new;
  end if;

  if comentario_pai.usuario_id = new.usuario_id then
    return new;
  end if;

  insert into public.notificacoes_usuario (
    tipo,
    usuario_destino_id,
    usuario_origem_id,
    comentario_id,
    comentario_pai_id,
    jogo_id
  )
  values (
    'comentario_resposta',
    comentario_pai.usuario_id,
    new.usuario_id,
    new.id,
    comentario_pai.id,
    new.jogo_id
  )
  on conflict (tipo, comentario_id, usuario_destino_id) do nothing;

  return new;
end;
$$;

drop trigger if exists comentarios_jogo_criar_notificacao on public.comentarios_jogo;
create trigger comentarios_jogo_criar_notificacao
  after insert on public.comentarios_jogo
  for each row
  execute function public.criar_notificacao_resposta_comentario();

create or replace function public.listar_comentarios_jogo()
returns table (
  id uuid,
  usuario_id uuid,
  usuario_nome text,
  jogo_id text,
  mensagem text,
  parent_id uuid,
  criado_em timestamptz,
  curtidas_count bigint,
  respostas_count bigint,
  curtido_por_mim boolean
)
language sql
stable
set search_path = public
as $$
  with curtidas as (
    select comentario_id, count(*)::bigint as total
    from public.comentario_curtidas
    group by comentario_id
  ),
  respostas as (
    select parent_id, count(*)::bigint as total
    from public.comentarios_jogo
    where parent_id is not null
    group by parent_id
  )
  select
    c.id,
    c.usuario_id,
    c.usuario_nome,
    c.jogo_id,
    c.mensagem,
    c.parent_id,
    c.criado_em,
    coalesce(ct.total, 0) as curtidas_count,
    coalesce(r.total, 0) as respostas_count,
    exists (
      select 1
      from public.comentario_curtidas cc
      where cc.comentario_id = c.id
        and cc.usuario_id = auth.uid()
    ) as curtido_por_mim
  from public.comentarios_jogo c
  left join curtidas ct on ct.comentario_id = c.id
  left join respostas r on r.parent_id = c.id
  order by c.criado_em desc;
$$;

grant execute on function public.listar_comentarios_jogo() to authenticated;
revoke execute on function public.listar_comentarios_jogo() from anon;

create or replace function public.listar_notificacoes_respostas(limit_count integer default 20)
returns table (
  id uuid,
  tipo text,
  usuario_destino_id uuid,
  usuario_origem_id uuid,
  usuario_origem_nome text,
  comentario_id uuid,
  comentario_pai_id uuid,
  jogo_id text,
  comentario_mensagem text,
  comentario_pai_mensagem text,
  lida_em timestamptz,
  criado_em timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    n.id,
    n.tipo,
    n.usuario_destino_id,
    n.usuario_origem_id,
    resposta.usuario_nome as usuario_origem_nome,
    n.comentario_id,
    n.comentario_pai_id,
    n.jogo_id,
    resposta.mensagem as comentario_mensagem,
    pai.mensagem as comentario_pai_mensagem,
    n.lida_em,
    n.criado_em
  from public.notificacoes_usuario n
  join public.comentarios_jogo resposta on resposta.id = n.comentario_id
  join public.comentarios_jogo pai on pai.id = n.comentario_pai_id
  where n.usuario_destino_id = auth.uid()
  order by n.criado_em desc
  limit greatest(coalesce(limit_count, 20), 1);
$$;

grant execute on function public.listar_notificacoes_respostas(integer) to authenticated;
revoke execute on function public.listar_notificacoes_respostas(integer) from anon;
