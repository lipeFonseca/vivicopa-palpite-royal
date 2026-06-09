-- Public match data powers the home page bracket. Predictions remain protected.
grant select on public.partidas to anon;

drop policy if exists partidas_leitura_publica on public.partidas;
create policy partidas_leitura_publica on public.partidas
  for select to anon using (true);
