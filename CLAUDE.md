# CLAUDE.md

Guia operacional para agentes trabalhando no ViViCopa.

## Estado Atual

- Branch principal: `main`, rastreando `origin/main`.
- O banco oficial do projeto e o Supabase direto:
  - project ref: `zqzhsxfsjqrskxmfpdfz`
  - URL: `https://zqzhsxfsjqrskxmfpdfz.supabase.co`
- O projeto antigo nao deve ser usado. Nao reintroduzir referencias a bancos anteriores.
- `.env` contem somente chaves publicas do Supabase. Nao gravar access tokens, service role keys ou senhas de banco em arquivos versionados.
- Para credenciais privadas locais, usar `.env.local`, que e ignorado pelo Git.

## Stack

- React 19 + TypeScript.
- TanStack Start / TanStack Router.
- TanStack Query.
- Vite 7 com plugins explicitos em `vite.config.ts`.
- Tailwind CSS 4.
- Radix UI / shadcn-style components em `src/components/ui`.
- Supabase JS v2.

Scripts em `package.json`:

- `dev`: `vite dev`
- `build`: `vite build`
- `build:dev`: `vite build --mode development`
- `build:pages`: `vite build --config vite.config.pages.ts`
- `preview`: `vite preview`
- `lint`: `eslint .`
- `format`: `prettier --write .`

## Supabase

Variaveis publicas aceitas pelo app:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

Para operacoes administrativas server-side, usar `SUPABASE_SERVICE_ROLE_KEY` apenas em ambiente seguro e nunca expor no cliente.

Arquivos relevantes:

- `src/integrations/supabase/client.ts`: client browser/SSR com chave publica.
- `src/integrations/supabase/client.server.ts`: client admin server-side com service role.
- `src/integrations/supabase/auth-attacher.ts`: anexa bearer token em server functions.
- `src/integrations/supabase/auth-middleware.ts`: valida bearer token e injeta contexto autenticado.
- `src/integrations/supabase/types.ts`: tipos gerados do schema `public`.
- `supabase/config.toml`: project ref do Supabase.

Schema remoto confirmado em `public`:

- tabelas: `profiles`, `palpites`, `partidas`
- view: `ranking`

## Estrutura Principal

- `src/routes/__root.tsx`: layout raiz, metadados, stylesheet global, `QueryClientProvider`, boundaries de 404 e erro.
- `src/routes/index.tsx`: experiencia principal da ViViCopa.
- `src/routes/copa.tsx`: experiencia com Supabase Auth, `partidas`, `palpites`, Realtime e `ranking`.
- `.github/workflows/pages.yml`: publica o frontend estatico no GitHub Pages.
- `src/router.tsx`: cria router com `routeTree.gen` e contexto de `QueryClient`.
- `src/start.ts`: registra middlewares globais.
- `src/server.ts`: wrapper SSR contra falhas server-side.
- `src/routeTree.gen.ts`: arquivo gerado. Evite edicao manual.

## Cuidados

- Antes de criar colunas/tabelas, confirmar o schema remoto e gerar migration SQL.
- Preferir migrations versionadas em `supabase/migrations`.
- Depois de alterar rotas, rodar `npm run build`; o TanStack pode tocar `src/routeTree.gen.ts`.
- Se `src/routeTree.gen.ts` aparecer modificado apenas por `LF/CRLF`, restaurar antes do commit.
