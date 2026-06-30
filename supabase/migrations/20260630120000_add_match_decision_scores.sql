ALTER TABLE partidas
  ADD COLUMN IF NOT EXISTS placar_regulamentar_a INTEGER,
  ADD COLUMN IF NOT EXISTS placar_regulamentar_b INTEGER,
  ADD COLUMN IF NOT EXISTS placar_penaltis_a INTEGER,
  ADD COLUMN IF NOT EXISTS placar_penaltis_b INTEGER,
  ADD COLUMN IF NOT EXISTS resultado_periodo TEXT;

ALTER TABLE partidas
  DROP CONSTRAINT IF EXISTS partidas_resultado_periodo_check;

ALTER TABLE partidas
  ADD CONSTRAINT partidas_resultado_periodo_check
  CHECK (
    resultado_periodo IS NULL
    OR resultado_periodo IN ('REGULAR', 'EXTRA_TIME', 'PENALTIES')
  );
