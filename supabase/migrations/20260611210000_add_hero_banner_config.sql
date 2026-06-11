-- Adiciona chave para banner do hero (retangulo azul da tela inicial)
insert into public.app_config (chave, valor) values
  ('hero_banner_url', '')
on conflict (chave) do nothing;
