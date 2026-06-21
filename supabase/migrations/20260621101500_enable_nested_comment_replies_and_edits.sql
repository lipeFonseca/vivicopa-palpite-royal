-- ============================================================
-- Comentarios aninhados livres + edicao por autor/admin
-- ============================================================

alter table public.comentarios_jogo
  add column if not exists editado_em timestamptz null;

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

  if new.parent_id = new.id then
    raise exception 'Um comentario nao pode responder a si mesmo';
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

  if exists (
    with recursive ancestrais as (
      select id, parent_id
      from public.comentarios_jogo
      where id = new.parent_id

      union all

      select c.id, c.parent_id
      from public.comentarios_jogo c
      join ancestrais a on c.id = a.parent_id
    )
    select 1
    from ancestrais
    where id = new.id
  ) then
    raise exception 'Nao e permitido criar ciclos entre comentarios';
  end if;

  return new;
end;
$$;

drop policy if exists comentarios_jogo_deleta on public.comentarios_jogo;
create policy comentarios_jogo_deleta
  on public.comentarios_jogo for delete
  to authenticated
  using (
    usuario_id = auth.uid()
    or app_private.is_admin(auth.uid())
  );

create or replace function public.editar_comentario_jogo(alvo_id uuid, nova_mensagem text)
returns public.comentarios_jogo
language plpgsql
security definer
set search_path = public
as $$
declare
  comentario public.comentarios_jogo%rowtype;
  mensagem_limpa text;
begin
  if auth.uid() is null then
    raise exception 'Sessao invalida';
  end if;

  select *
  into comentario
  from public.comentarios_jogo
  where id = alvo_id;

  if not found then
    raise exception 'Comentario nao encontrado';
  end if;

  if comentario.usuario_id <> auth.uid() and not app_private.is_admin(auth.uid()) then
    raise exception 'Apenas o autor ou um administrador pode editar este comentario';
  end if;

  mensagem_limpa := btrim(coalesce(nova_mensagem, ''));
  if mensagem_limpa = '' then
    raise exception 'A mensagem do comentario nao pode ficar vazia';
  end if;

  update public.comentarios_jogo
  set mensagem = mensagem_limpa,
      editado_em = now()
  where id = alvo_id
  returning *
  into comentario;

  return comentario;
end;
$$;

grant execute on function public.editar_comentario_jogo(uuid, text) to authenticated;
revoke execute on function public.editar_comentario_jogo(uuid, text) from anon;

create or replace function public.excluir_comentario_jogo(alvo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  comentario public.comentarios_jogo%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sessao invalida';
  end if;

  select *
  into comentario
  from public.comentarios_jogo
  where id = alvo_id;

  if not found then
    raise exception 'Comentario nao encontrado';
  end if;

  if comentario.usuario_id <> auth.uid() and not app_private.is_admin(auth.uid()) then
    raise exception 'Apenas o autor ou um administrador pode excluir este comentario';
  end if;

  if exists (
    select 1
    from public.comentarios_jogo
    where parent_id = alvo_id
  ) then
    raise exception 'Nao e possivel excluir um comentario que ja possui respostas';
  end if;

  delete from public.comentarios_jogo
  where id = alvo_id;
end;
$$;

grant execute on function public.excluir_comentario_jogo(uuid) to authenticated;
revoke execute on function public.excluir_comentario_jogo(uuid) from anon;

drop function if exists public.listar_comentarios_jogo();

create function public.listar_comentarios_jogo()
returns table (
  id uuid,
  usuario_id uuid,
  usuario_nome text,
  jogo_id text,
  mensagem text,
  parent_id uuid,
  criado_em timestamptz,
  editado_em timestamptz,
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
    c.editado_em,
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
