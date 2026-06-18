-- Adiciona dois crons fast-live extras: +15s e +45s por minuto.
-- Resultado: ESPN sincroniza o banco a cada ~15s (:00+15s, :00+30s, :00+45s).
-- Combinado com o polling ESPN direto no frontend (10s), latência visual ≤ 10s.

select cron.schedule(
  'atualizar-placares-fast-live-offset-15s',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://zqzhsxfsjqrskxmfpdfz.supabase.co/functions/v1/atualizar-placares?mode=fast-live&delay=15',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_lyT42yNUnvfoqakfuQp9Mw_q4zPcrh9',
      'Authorization', 'Bearer sb_publishable_lyT42yNUnvfoqakfuQp9Mw_q4zPcrh9'
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'atualizar-placares-fast-live-offset-45s',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://zqzhsxfsjqrskxmfpdfz.supabase.co/functions/v1/atualizar-placares?mode=fast-live&delay=45',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_lyT42yNUnvfoqakfuQp9Mw_q4zPcrh9',
      'Authorization', 'Bearer sb_publishable_lyT42yNUnvfoqakfuQp9Mw_q4zPcrh9'
    ),
    body := '{}'::jsonb
  );
  $$
);
