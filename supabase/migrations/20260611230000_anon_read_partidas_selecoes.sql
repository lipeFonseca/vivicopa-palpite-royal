-- Allow anonymous (unauthenticated) reads so the public dashboard can show
-- live scores and the next upcoming match without requiring login.

GRANT SELECT ON public.partidas TO anon;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'partidas' AND policyname = 'partidas_leitura_anon'
  ) THEN
    CREATE POLICY partidas_leitura_anon ON public.partidas
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

GRANT SELECT ON public.selecoes TO anon;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'selecoes' AND policyname = 'selecoes_leitura_anon'
  ) THEN
    CREATE POLICY selecoes_leitura_anon ON public.selecoes
      FOR SELECT TO anon USING (true);
  END IF;
END $$;
