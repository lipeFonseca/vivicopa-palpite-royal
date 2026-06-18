-- Adiciona ESPN ID à tabela de partidas e cria tabela de notícias

ALTER TABLE partidas ADD COLUMN IF NOT EXISTS espn_id TEXT;
CREATE INDEX IF NOT EXISTS partidas_espn_id_idx ON partidas (espn_id);

CREATE TABLE IF NOT EXISTS noticias (
  id            TEXT PRIMARY KEY,
  titulo        TEXT NOT NULL,
  descricao     TEXT,
  tipo          TEXT,                  -- "Recap", "Preview", "News"
  partida_id    TEXT REFERENCES partidas(id) ON DELETE SET NULL,
  imagem_url    TEXT,
  publicado_em  TIMESTAMPTZ,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS noticias_partida_id_idx ON noticias (partida_id);
CREATE INDEX IF NOT EXISTS noticias_publicado_em_idx ON noticias (publicado_em DESC);

ALTER TABLE noticias ENABLE ROW LEVEL SECURITY;

-- Leitura pública
CREATE POLICY "noticias_public_read" ON noticias
  FOR SELECT USING (true);

-- Escrita apenas via service role (cron)
CREATE POLICY "noticias_service_write" ON noticias
  FOR ALL USING (auth.role() = 'service_role');
