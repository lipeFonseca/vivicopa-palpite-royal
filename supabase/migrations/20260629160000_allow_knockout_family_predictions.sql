create or replace function public.palpite_familia_jogo_aberto(_jogo_id text)
returns boolean
language sql
stable
set search_path = public
as $$
  with jogo_direto as (
    select 1
    from public.partidas p
    where p.id = _jogo_id
      and p.status = 'NS'
      and p.inicia_em is not null
      and p.inicia_em > now()
    limit 1
  ),
  parsed as (
    select substring(_jogo_id from '^R[0-9]+-([0-9]+)-[A-Z]$')::int as ordem
  ),
  partidas_grupo as (
    select
      p.id,
      p.status,
      p.inicia_em,
      row_number() over (order by p.inicia_em asc, p.id asc) as ordem
    from public.partidas p
    where p.fase = 'GROUP_STAGE'
      and p.inicia_em is not null
  ),
  jogo_catalogo as (
    select 1
    from partidas_grupo p
    join parsed r on r.ordem = p.ordem
    where p.status = 'NS'
      and p.inicia_em > now()
    limit 1
  )
  select exists(select 1 from jogo_direto) or exists(select 1 from jogo_catalogo);
$$;

grant execute on function public.palpite_familia_jogo_aberto(text) to authenticated;
