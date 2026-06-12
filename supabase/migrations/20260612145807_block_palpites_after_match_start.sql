create or replace function public.palpite_partida_aberta(_partida_id text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.partidas p
    where p.id = _partida_id
      and p.status = 'NS'
      and p.inicia_em is not null
      and p.inicia_em > now()
  );
$$;

drop policy if exists "palpites_insere_proprio" on public.palpites;
drop policy if exists "palpites_edita_proprio" on public.palpites;
drop policy if exists "palpites_deleta_proprio" on public.palpites;

create policy "palpites_insere_proprio"
  on public.palpites for insert
  to authenticated
  with check (
    usuario_id = auth.uid()
    and public.palpite_partida_aberta(partida_id)
  );

create policy "palpites_edita_proprio"
  on public.palpites for update
  to authenticated
  using (
    usuario_id = auth.uid()
    and public.palpite_partida_aberta(partida_id)
  )
  with check (
    usuario_id = auth.uid()
    and public.palpite_partida_aberta(partida_id)
  );

create policy "palpites_deleta_proprio"
  on public.palpites for delete
  to authenticated
  using (
    usuario_id = auth.uid()
    and public.palpite_partida_aberta(partida_id)
  );

create or replace function public.palpite_familia_jogo_aberto(_jogo_id text)
returns boolean
language sql
stable
set search_path = public
as $$
  with parsed as (
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
  )
  select exists (
    select 1
    from partidas_grupo p
    join parsed r on r.ordem = p.ordem
    where p.status = 'NS'
      and p.inicia_em > now()
  );
$$;

drop policy if exists palpites_familia_insere on public.palpites_familia;
drop policy if exists palpites_familia_edita on public.palpites_familia;
drop policy if exists palpites_familia_deleta on public.palpites_familia;

create policy palpites_familia_insere
  on public.palpites_familia for insert
  to authenticated
  with check (
    usuario_id = auth.uid()
    and public.palpite_familia_jogo_aberto(jogo_id)
  );

create policy palpites_familia_edita
  on public.palpites_familia for update
  to authenticated
  using (
    usuario_id = auth.uid()
    and public.palpite_familia_jogo_aberto(jogo_id)
  )
  with check (
    usuario_id = auth.uid()
    and public.palpite_familia_jogo_aberto(jogo_id)
  );

create policy palpites_familia_deleta
  on public.palpites_familia for delete
  to authenticated
  using (
    usuario_id = auth.uid()
    and public.palpite_familia_jogo_aberto(jogo_id)
  );

grant execute on function public.palpite_partida_aberta(text) to authenticated;
grant execute on function public.palpite_familia_jogo_aberto(text) to authenticated;
