-- Allow anonymous (unauthenticated) reads so the public dashboard can show
-- live scores and the next upcoming match without requiring login.

GRANT SELECT ON public.partidas TO anon;
CREATE POLICY partidas_leitura_anon ON public.partidas
  FOR SELECT TO anon USING (true);

GRANT SELECT ON public.selecoes TO anon;
CREATE POLICY selecoes_leitura_anon ON public.selecoes
  FOR SELECT TO anon USING (true);
