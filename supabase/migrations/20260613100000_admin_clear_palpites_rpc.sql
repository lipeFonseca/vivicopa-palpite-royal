-- ============================================================
-- Permite que admin apague todos os palpites/comentarios
-- via RPC com security definer (executa como dono da funcao)
-- ============================================================

-- Funcao RPC: verifica role admin antes de apagar tudo
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
    raise exception 'Acesso negado: apenas admins podem executar esta ação';
  end if;

  delete from public.palpites_familia;
end;
$$;

grant execute on function public.apagar_todos_palpites() to authenticated;
revoke execute on function public.apagar_todos_palpites() from anon;
