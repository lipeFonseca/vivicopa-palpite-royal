create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.partidas (
  id text primary key,
  time_a text not null,
  time_b text not null,
  placar_a int not null default 0,
  placar_b int not null default 0,
  status text not null default 'NS',
  inicia_em timestamptz
);

grant select on public.partidas to authenticated;
grant all on public.partidas to service_role;

alter table public.partidas enable row level security;

create policy "partidas_leitura" on public.partidas for select to authenticated using (true);

create table if not exists public.palpites (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) default auth.uid(),
  partida_id text not null references public.partidas(id),
  palpite_a int not null,
  palpite_b int not null,
  criado_em timestamptz default now(),
  unique (usuario_id, partida_id)
);

grant select, insert, update, delete on public.palpites to authenticated;
grant all on public.palpites to service_role;

alter table public.palpites enable row level security;

create policy "palpites_leitura_familia" on public.palpites for select to authenticated using (true);
create policy "palpites_insere_proprio" on public.palpites for insert to authenticated with check (usuario_id = auth.uid());
create policy "palpites_edita_proprio" on public.palpites for update to authenticated using (usuario_id = auth.uid());

alter publication supabase_realtime add table public.partidas;

create or replace view public.ranking with (security_invoker = true) as
select
  p.usuario_id,
  count(*) filter (where pa.status in ('FT','AET','PEN')) as jogos_pontuados,
  coalesce(sum(
    case when pa.status in ('FT','AET','PEN') then
      case
        when p.palpite_a = pa.placar_a and p.palpite_b = pa.placar_b then 3
        when sign(p.palpite_a - p.palpite_b) = sign(pa.placar_a - pa.placar_b) then 1
        else 0 end
    else 0 end
  ),0) as pontos
from public.palpites p
join public.partidas pa on pa.id = p.partida_id
group by p.usuario_id
order by pontos desc;

grant select on public.ranking to authenticated;