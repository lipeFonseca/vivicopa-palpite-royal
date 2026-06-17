-- Remove o pg_sleep(30) do cron que segurava uma conexão ao banco por 30s.
-- O delay de 30s agora é tratado dentro da Edge Function via ?delay=30,
-- liberando a conexão imediatamente após o disparo do http_post.

select cron.unschedule('atualizar-placares-fast-live-offset-30s');

select cron.schedule(
  'atualizar-placares-fast-live-offset-30s',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://zqzhsxfsjqrskxmfpdfz.supabase.co/functions/v1/atualizar-placares?mode=fast-live&delay=30',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_lyT42yNUnvfoqakfuQp9Mw_q4zPcrh9',
      'Authorization', 'Bearer sb_publishable_lyT42yNUnvfoqakfuQp9Mw_q4zPcrh9'
    ),
    body := '{}'::jsonb
  );
  $$
);
