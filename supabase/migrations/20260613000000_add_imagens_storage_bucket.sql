-- ============================================================
-- Bucket de Storage para imagens do app (logo, banners, etc.)
-- Substitui o armazenamento de Base64 diretamente no banco.
-- Compatibilidade mantida: valores Base64/URL legados em
-- app_config continuam funcionando sem quebra.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imagens-app',
  'imagens-app',
  true,
  5242880, -- 5 MB
  array[
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif',
    'image/webp', 'image/svg+xml',
    'image/x-icon', 'image/vnd.microsoft.icon'
  ]
)
on conflict (id) do nothing;

-- Leitura publica (logo aparece antes do login, para anon tambem)
create policy "imagens_app_leitura_publica"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'imagens-app');

-- Upload somente para admin
create policy "imagens_app_upload_admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'imagens-app'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Substituicao de arquivo somente para admin
create policy "imagens_app_update_admin"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'imagens-app'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    bucket_id = 'imagens-app'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Exclusao somente para admin
create policy "imagens_app_delete_admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'imagens-app'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
