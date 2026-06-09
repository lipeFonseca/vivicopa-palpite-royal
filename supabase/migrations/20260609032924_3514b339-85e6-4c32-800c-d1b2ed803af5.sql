
-- Recreate database schema for Copa 2026 (clean rebuild in user's own backend)
DROP VIEW IF EXISTS public.ranking;
DROP TABLE IF EXISTS public.palpites;
DROP TABLE IF EXISTS public.partidas;

-- partidas: jogos da copa (somente leitura pelo app; escrita via service role / edge function)
CREATE TABLE public.partidas (
  id text PRIMARY KEY,
  time_a text NOT NULL,
  time_b text NOT NULL,
  placar_a integer NOT NULL DEFAULT 0,
  placar_b integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'NS',
  inicia_em timestamptz
);
GRANT SELECT ON public.partidas TO authenticated;
GRANT ALL ON public.partidas TO service_role;
ALTER TABLE public.partidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY partidas_leitura ON public.partidas
  FOR SELECT TO authenticated USING (true);

-- palpites: palpite de cada usuário em cada partida
CREATE TABLE public.palpites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL DEFAULT auth.uid(),
  partida_id text NOT NULL REFERENCES public.partidas(id) ON DELETE CASCADE,
  palpite_a integer NOT NULL,
  palpite_b integer NOT NULL,
  criado_em timestamptz DEFAULT now(),
  UNIQUE (usuario_id, partida_id)
);
GRANT SELECT, INSERT, UPDATE ON public.palpites TO authenticated;
GRANT ALL ON public.palpites TO service_role;
ALTER TABLE public.palpites ENABLE ROW LEVEL SECURITY;
CREATE POLICY palpites_leitura_familia ON public.palpites
  FOR SELECT TO authenticated USING (true);
CREATE POLICY palpites_insere_proprio ON public.palpites
  FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
CREATE POLICY palpites_edita_proprio ON public.palpites
  FOR UPDATE TO authenticated USING (usuario_id = auth.uid());

-- ranking: view de pontuação (3 pts placar exato, 1 pt resultado)
CREATE VIEW public.ranking
WITH (security_invoker = true)
AS
SELECT p.usuario_id,
       count(*) FILTER (WHERE pa.status = ANY (ARRAY['FT','AET','PEN'])) AS jogos_pontuados,
       COALESCE(sum(
         CASE WHEN pa.status = ANY (ARRAY['FT','AET','PEN']) THEN
           CASE
             WHEN p.palpite_a = pa.placar_a AND p.palpite_b = pa.placar_b THEN 3
             WHEN sign((p.palpite_a - p.palpite_b)::double precision) = sign((pa.placar_a - pa.placar_b)::double precision) THEN 1
             ELSE 0
           END
         ELSE 0 END
       ), 0::bigint) AS pontos
FROM public.palpites p
JOIN public.partidas pa ON pa.id = p.partida_id
GROUP BY p.usuario_id
ORDER BY 3 DESC;

GRANT SELECT ON public.ranking TO authenticated;
