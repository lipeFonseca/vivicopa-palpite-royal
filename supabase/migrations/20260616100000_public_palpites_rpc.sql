-- RPC pública para buscar palpites de jogos específicos, bypassando RLS.
-- Necessário porque a policy de leitura de palpites_familia restringe
-- usuários comuns a ver apenas os próprios palpites, mas para exibir
-- "Palpiteiros da Copa" precisamos ver palpites de todos os usuários
-- em jogos já finalizados.

create or replace function public.get_palpites_by_jogo_ids(jogo_ids text[])
returns table (
  id        uuid,
  usuario_id uuid,
  usuario_nome text,
  jogo_id   text,
  placar_a  integer,
  placar_b  integer,
  criado_em timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    pf.id,
    pf.usuario_id,
    pf.usuario_nome,
    pf.jogo_id,
    pf.placar_a,
    pf.placar_b,
    pf.criado_em
  from public.palpites_familia pf
  where pf.jogo_id = any(jogo_ids)
  order by pf.criado_em desc;
$$;

grant execute on function public.get_palpites_by_jogo_ids(text[]) to authenticated;

-- RPC para admin ver todos os palpites (sem filtro de jogo)
create or replace function public.get_all_palpites_familia_admin()
returns table (
  id        uuid,
  usuario_id uuid,
  usuario_nome text,
  jogo_id   text,
  placar_a  integer,
  placar_b  integer,
  criado_em timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    pf.id,
    pf.usuario_id,
    pf.usuario_nome,
    pf.jogo_id,
    pf.placar_a,
    pf.placar_b,
    pf.criado_em
  from public.palpites_familia pf
  order by pf.criado_em desc;
$$;

grant execute on function public.get_all_palpites_familia_admin() to authenticated;
