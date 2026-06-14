-- ============================================================
-- Separa comentarios de palpites para permitir comentarios livres
-- e manter 1 unico palpite por usuario em cada jogo.
-- ============================================================

create table if not exists public.comentarios_jogo (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  usuario_nome text not null,
  jogo_id text not null,
  mensagem text not null,
  criado_em timestamptz not null default now()
);

alter table public.comentarios_jogo enable row level security;

create policy comentarios_jogo_leitura
  on public.comentarios_jogo for select
  to authenticated using (true);

create policy comentarios_jogo_insere
  on public.comentarios_jogo for insert
  to authenticated
  with check (usuario_id = auth.uid());

create policy comentarios_jogo_deleta
  on public.comentarios_jogo for delete
  to authenticated
  using (usuario_id = auth.uid());

grant select, insert, delete on public.comentarios_jogo to authenticated;
grant all on public.comentarios_jogo to service_role;

create index if not exists comentarios_jogo_jogo_idx
  on public.comentarios_jogo (jogo_id, criado_em desc);

create index if not exists comentarios_jogo_usuario_idx
  on public.comentarios_jogo (usuario_id, criado_em desc);

insert into public.comentarios_jogo (usuario_id, usuario_nome, jogo_id, mensagem, criado_em)
select
  usuario_id,
  usuario_nome,
  jogo_id,
  comentario,
  criado_em
from public.palpites_familia
where comentario is not null
  and btrim(comentario) <> ''
on conflict do nothing;

update public.palpites_familia
set comentario = null
where comentario is not null
  and btrim(comentario) <> '';

drop policy if exists palpites_familia_leitura on public.palpites_familia;

create policy palpites_familia_leitura
  on public.palpites_familia for select
  to authenticated
  using (
    usuario_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create or replace function public.apagar_todos_palpites()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Acesso negado: apenas admins podem executar esta acao';
  end if;

  delete from public.comentarios_jogo;
  delete from public.palpites_familia;
end;
$$;

grant execute on function public.apagar_todos_palpites() to authenticated;
revoke execute on function public.apagar_todos_palpites() from anon;
