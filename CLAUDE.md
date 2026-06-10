# CLAUDE.md

Guia operacional para agentes trabalhando neste projeto Lovable/TanStack Start. Objetivo: dar contexto suficiente para evoluir o app com seguranca, sem quebrar o fluxo do Lovable, Supabase ou arquivos gerados.

## Estado Atual

- Projeto clonado em `C:\Users\USER\Desktop\GitHub\vivicopa-palpite-royal`.
- Branch local: `main`, rastreando `origin/main`.
- Status antes deste arquivo: limpo, sem alteracoes locais.
- Ultimo commit observado: `3ef919b Adicionou aba de chaveamento`.
- Identidade Git local configurada:
  - `user.name=FelipeAugusto`
  - `user.email=faugustogf@gmail.com`
- Dependencias ainda nao instaladas localmente: `node_modules` nao existe.
- Bun nao esta disponivel no PATH deste ambiente no momento da analise.
- `.env` existe e esta rastreado pelo Git neste clone. Seus valores nao devem ser copiados para documentacao, logs ou mensagens. Antes de publicar alteracoes, revisar se os valores sao seguros para permanecer no historico remoto ou se precisam de rotacao/limpeza de historico. Variaveis vistas por nome:
  - `SUPABASE_PROJECT_ID`
  - `SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_URL`
  - `VITE_SUPABASE_PROJECT_ID`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_URL`

## Stack

- React 19 + TypeScript.
- TanStack Start / TanStack Router.
- TanStack Query.
- Vite 7 via `@lovable.dev/vite-tanstack-config`.
- Tailwind CSS 4.
- Radix UI / shadcn-style components em `src/components/ui`.
- Supabase JS v2.
- Bun lockfile (`bun.lock`) e `bunfig.toml` com guarda de supply chain.

Scripts em `package.json`:

- `dev`: `vite dev`
- `build`: `vite build`
- `build:dev`: `vite build --mode development`
- `preview`: `vite preview`
- `lint`: `eslint .`
- `format`: `prettier --write .`

## Regra de Ouro Para Lovable

Nao duplicar manualmente plugins que o Lovable ja injeta. O comentario em `vite.config.ts` e importante:

- `@lovable.dev/vite-tanstack-config` ja inclui TanStack Start, React, Tailwind, tsconfig paths, Nitro, component tagger, injecao de env `VITE_*`, alias `@`, dedupe React/TanStack, error logger e deteccao de sandbox.
- Se precisar configurar Vite, passe apenas configuracoes adicionais dentro de `defineConfig({ vite: { ... } })`.
- Nao remover o redirect do server entry:
  - `tanstackStart.server.entry = "server"`
  - ele aponta para `src/server.ts`, que contem wrapper de erro SSR.

## Estrutura Principal

- `src/routes/__root.tsx`
  - Layout raiz, metadados, stylesheet global, `QueryClientProvider`, boundaries de 404 e erro.
- `src/routes/index.tsx`
  - Experiencia principal local da Vivicopa.
  - Usa dados estaticos e `localStorage`.
  - Abas: inicio, jogos, calendario, selecoes, grupos, chaveamento, titulos, meus palpites, tabela e comentarios.
- `src/routes/copa.tsx`
  - Experiencia com Supabase.
  - Requer usuario autenticado via Supabase Auth.
  - Le `partidas`, grava `palpites`, acompanha Realtime em `partidas` e mostra `ranking`.
- `src/router.tsx`
  - Cria router com `routeTree.gen` e contexto de `QueryClient`.
- `src/start.ts`
  - Registra `attachSupabaseAuth` como `functionMiddleware`.
  - Registra middleware de erro server-side.
- `src/server.ts`
  - Wrapper SSR contra falhas engolidas pelo h3/TanStack Start.
  - Nao remover sem testar build e rotas.
- `src/routeTree.gen.ts`
  - Arquivo gerado. Evite edicao manual.

## Fluxo Local Da Rota `/`

A rota `/` e uma aplicacao familiar de palpites sem backend real.

Dados:

- Selecoes e jogos: `src/data/worldcup2026.ts`.
- Estatisticas historicas: `src/data/selecaoStats.ts`.
- Bandeiras: `src/lib/flags.ts`.

Persistencia:

- Palpites de jogos: `src/lib/storage.ts`, chave `vivicopa:palpites`.
- Nome do usuario: `vivicopa:usuario`.
- Chaveamento/mata-mata: `src/lib/bracket.ts`, chave `vivicopa:mata-mata`.

Componentes especificos:

- `src/components/vivicopa/Header.tsx`
- `src/components/vivicopa/Footer.tsx`
- `src/components/vivicopa/GameCard.tsx`
- `src/components/vivicopa/PredictionModal.tsx`
- `src/components/vivicopa/Chaveamento.tsx`

Pontos de cuidado:

- `localStorage` so existe no browser. Manter guards `typeof window !== "undefined"` em libs compartilhadas.
- A rota `/` nao sincroniza palpites entre usuarios/dispositivos.
- O chaveamento local e livre: o usuario escolhe selecoes; vencedores sao sugeridos para fases seguintes.
- O empate no chaveamento local prioriza o lado A como dica visual.

## Fluxo Supabase Da Rota `/copa`

A rota `/copa` e o fluxo conectado ao banco.

Tabelas/view esperadas:

- `public.partidas`
  - Jogos, placares, status, data e metadados de fase/grupo/rodada.
  - Leitura por usuarios autenticados.
  - Escrita esperada via service role/Edge Function.
- `public.palpites`
  - Palpite por usuario e partida.
  - Chave unica: `(usuario_id, partida_id)`.
  - Usuarios autenticados podem inserir/atualizar os proprios palpites.
  - Leitura familiar esta aberta a autenticados.
- `public.ranking`
  - View com `security_invoker = true`.
  - Pontuacao: 3 pontos para placar exato, 1 para resultado, 0 caso contrario.

Realtime:

- `public.partidas` entra na publication `supabase_realtime`.
- A rota `/copa` assina updates de `partidas` para lista de jogos e chaveamento.

Auth:

- `src/integrations/supabase/client.ts`
  - Cliente browser/SSR com publishable key.
  - Usa `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` no client e fallback `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` em SSR.
- `src/integrations/supabase/client.server.ts`
  - Cliente admin com `SUPABASE_SERVICE_ROLE_KEY`.
  - Usar apenas em codigo server-side confiavel.
  - Nunca importar em componente client ou rota renderizada no browser.
- `src/integrations/supabase/auth-attacher.ts`
  - Anexa bearer token em server functions.
- `src/integrations/supabase/auth-middleware.ts`
  - Valida bearer token via `supabase.auth.getClaims`.

Edge Function:

- `supabase/functions/atualizar-placares/index.ts`
  - Busca dados em `https://api.football-data.org/v4`.
  - Competicao `WC`, temporada `2026`.
  - Usa `FOOTBALL_DATA_TOKEN`.
  - Usa `SUPABASE_SERVICE_ROLE_KEY` dentro da Edge Function.
  - `?seed=true` carrega todos os jogos da temporada.
  - Sem `seed`, so atualiza perto de janelas de jogos.

Cron:

- `supabase/migrations/20260609050000_schedule_scoreboard_sync.sql`
  - Agenda `atualizar-placares-every-minute`.
  - Agenda `atualizar-placares-seed-daily`.
- `supabase/cron-monitoring.sql`
  - Consultas manuais para inspecionar cron, execucoes e estado de partidas.

## Migrations Supabase

Arquivos observados:

- `20260608153340_97923fd4-673e-4bc3-b494-5723d06b2d06.sql`
  - Cria extensoes `pg_cron` e `pg_net`.
  - Cria `partidas`, `palpites`, RLS, policies, Realtime e view `ranking`.
- `20260609032924_3514b339-85e6-4c32-800c-d1b2ed803af5.sql`
  - Rebuild limpo do schema: drop/recreate de `ranking`, `palpites`, `partidas`.
  - Recria RLS, policies e `ranking`.
- `20260609043000_realtime_partidas_indexes.sql`
  - Restaura Realtime em `partidas`.
  - Adiciona indices `partidas_status_inicia_em_idx` e `palpites_usuario_id_idx`.
- `20260609050000_schedule_scoreboard_sync.sql`
  - Representa cron jobs em source control.
- `20260609053000_add_match_phase_metadata.sql`
  - Adiciona `fase`, `grupo`, `rodada` e indices por fase/grupo.
- `20260610023041_212cb5c5-d37a-4499-90b6-02cff9e6090c.sql`
  - Repete `fase`, `grupo`, `rodada` com `if not exists` e os mesmos indices.

Ponto de atencao:

- Ha duplicidade segura nas migrations de metadados de partida porque usam `add column if not exists` e `create index if not exists`. Nao remover sem confirmar historico aplicado no Supabase remoto.

## Seguranca Supabase

- RLS esta habilitado em `public.partidas` e `public.palpites`.
- `ranking` usa `security_invoker = true`, bom para respeitar RLS.
- `service_role` aparece no cliente server-side e Edge Function. Deve permanecer fora de codigo client.
- Nao usar `user_metadata` para autorizacao.
- Se criar novas tabelas em schema exposto (`public`), habilitar RLS e criar policies especificas.
- Se criar views novas, preferir `WITH (security_invoker = true)`.
- Para migrations novas, usar Supabase CLI quando disponivel:
  - `supabase migration new nome_descritivo`
  - Nunca inventar nome manualmente se o CLI estiver disponivel.

## Arquivos Gerados Ou Sensiveis

Evitar edicao manual:

- `src/routeTree.gen.ts`
- `src/integrations/supabase/types.ts`, salvo quando regenerado a partir do Supabase.
- `bun.lock`, salvo quando dependencias mudarem.
- Arquivos em `src/components/ui` se a mudanca nao for no design system.

Tratar com cuidado:

- `.env`: nunca commitar segredos. Neste clone, `.env` aparece em `git ls-files .env`, ou seja, esta tracked. Tratar como ponto de seguranca antes de qualquer publicacao sensivel.
- `vite.config.ts`: nao duplicar plugins do Lovable.
- `src/server.ts` e `src/start.ts`: mexer so com teste de SSR/build.
- `supabase/migrations/*`: alteracoes exigem plano e validacao.

## Como Rodar Com Seguranca

O projeto parece orientado a Bun, mas Bun nao estava disponivel neste ambiente durante a analise.

Quando Bun estiver instalado:

```powershell
bun install
bun run dev
bun run lint
bun run build
```

Se usar npm/pnpm/yarn por necessidade, cuidado para nao gerar lockfile concorrente sem decisao explicita. O lockfile atual e `bun.lock`.

## Checklist Antes De Alterar

1. Rode `git status --short --branch`.
2. Identifique se a mudanca e local (`/`) ou Supabase (`/copa`).
3. Para UI local:
   - Prefira editar `src/routes/index.tsx`, `src/components/vivicopa/*`, `src/lib/bracket.ts`, `src/lib/storage.ts` ou dados em `src/data/*`.
   - Preserve guards de browser em codigo com `localStorage`.
4. Para Supabase:
   - Nao importar `client.server.ts` em codigo client.
   - Nao mexer em RLS sem revisar leitura/escrita esperada.
   - Nao alterar cron/Edge Function sem confirmar secrets e deploy.
5. Para Lovable/TanStack:
   - Nao editar `routeTree.gen.ts` manualmente.
   - Nao duplicar plugins no Vite.
   - Testar rotas `/` e `/copa` depois de mudancas.
6. Validar:
   - `bun run lint`
   - `bun run build`
   - Teste manual no browser para fluxo alterado.
7. Antes de commit:
   - `git diff`
   - confirmar que `.env`, secrets, `dist`, `.output`, `.vinxi` e artefatos locais nao entraram.

## Estado Funcional Mapeado

- `/` deve funcionar sem login e sem Supabase, desde que o build rode.
- `/copa` depende de Supabase Auth e dados em `public.partidas`.
- A sincronizacao de placares depende de:
  - Edge Function implantada.
  - Secret `FOOTBALL_DATA_TOKEN`.
  - `SUPABASE_SERVICE_ROLE_KEY`.
  - Cron jobs ativos.
- Ranking so pontua partidas com status `FT`, `AET` ou `PEN`.
- Palpites em partidas bloqueiam quando `status !== "NS"` na rota `/copa`.

## Observacoes Da Analise

- O projeto tem cerca de 77 arquivos em `src` e aproximadamente 7056 linhas TS/TSX.
- As maiores superficies sao `src/routes/index.tsx` e `src/routes/copa.tsx`.
- Ha textos com caracteres acentuados que apareceram corrompidos no terminal durante leitura. Antes de editar textos exibidos ao usuario, abrir no editor com encoding correto para evitar piorar acentuacao.
- A rota `/` e a rota `/copa` parecem representar duas fases/experiencias do produto. Nao assumir que uma substitui a outra sem confirmacao.
