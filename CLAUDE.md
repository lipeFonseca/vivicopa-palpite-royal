# CLAUDE.md

Guia operacional para agentes trabalhando no ViViCopa.

## Estado Atual

- Branch principal: `main`, rastreando `origin/main`.
- Deploy automático via GitHub Actions em cada push para `main` → GitHub Pages.
- URL pública: `https://lipefonseca.github.io/vivicopa-palpite-royal/`
- Banco oficial: Supabase direto (projeto `zqzhsxfsjqrskxmfpdfz`, região West US Oregon).
- Todas as migrations locais estão aplicadas no remoto (9/9 em sincronia).

## Stack

- React 19 + TypeScript.
- TanStack Start / TanStack Router (modo CSR estático no build de Pages).
- TanStack Query.
- Vite 7 com plugins explícitos em `vite.config.ts`.
- Tailwind CSS 4.
- Radix UI / shadcn-style components em `src/components/ui`.
- Supabase JS v2.

Scripts em `package.json`:

- `dev`: `vite dev`
- `build`: `vite build`
- `build:dev`: `vite build --mode development`
- `build:pages`: `vite build --config vite.config.pages.ts` — usado pelo CI
- `preview`: `vite preview`
- `lint`: `eslint .`
- `format`: `prettier --write .`

## Supabase

- project ref: `zqzhsxfsjqrskxmfpdfz`
- URL: `https://zqzhsxfsjqrskxmfpdfz.supabase.co`
- Access token (CLI): variável de ambiente `SUPABASE_ACCESS_TOKEN` — valor em `.env.local` (nunca versionar).
- `.env` contém somente chaves públicas. Nunca versionar service role key ou access token.
- Para credenciais privadas locais usar `.env.local` (ignorado pelo Git).

Variáveis públicas aceitas pelo app:

- `VITE_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY`

Para operações administrativas server-side usar `SUPABASE_SERVICE_ROLE_KEY` apenas em ambiente seguro.

Arquivos relevantes:

- `src/integrations/supabase/client.ts`: client browser/SSR com chave pública (lazy singleton via Proxy).
- `src/integrations/supabase/client.server.ts`: client admin server-side com service role.
- `src/integrations/supabase/auth-attacher.ts`: anexa bearer token em server functions.
- `src/integrations/supabase/auth-middleware.ts`: valida bearer token e injeta contexto autenticado.
- `src/integrations/supabase/types.ts`: tipos gerados do schema `public`.

## Schema Remoto — Tabelas e Views

Todas as tabelas têm RLS ativo. Schema `public`.

### `partidas`
Jogos da Copa sincronizados via football-data.org.
Colunas: `id (text PK)`, `time_a`, `time_b`, `placar_a`, `placar_b`, `status`, `inicia_em`, `fase`, `grupo`, `rodada`.
RLS: leitura para autenticados (`partidas_leitura`).

### `palpites`
Palpites para as partidas do banco (usados na rota `/copa`).
Colunas: `id (uuid PK)`, `usuario_id (uuid FK → auth.users)`, `partida_id (text FK → partidas)`, `palpite_a`, `palpite_b`.
RLS: leitura família, insert/update/delete próprio.

### `palpites_familia`
**Novo (migration 20260611200000).** Palpites + comentários da família para a experiência principal (`/` index).
Colunas: `id (uuid PK)`, `usuario_id (uuid FK → auth.users)`, `usuario_nome (text)`, `jogo_id (text)`, `selecao_a`, `selecao_b`, `placar_a`, `placar_b`, `comentario (text nullable)`, `criado_em`, `atualizado_em`.
Constraint: `UNIQUE (usuario_id, jogo_id)`.
RLS: leitura para todos autenticados; insert/update/delete apenas do próprio registro.
Índices: `usuario_id`, `jogo_id`.

### `profiles`
Perfis de usuário criados automaticamente via trigger `on_auth_user_created_profile`.
Colunas: `id (uuid PK FK → auth.users)`, `username (text)`, `role (text)` — valores possíveis: `'admin'`, `'user'`.
RLS: select próprio ou admin; update do próprio username.

### `selecoes`
**Novo (migration 20260611010000).** Catálogo de seleções sincronizado pela football-data.org.
Colunas: `id (text PK)`, `football_data_id (integer GENERATED)`, `nome`, `nome_curto`, `sigla`, `area_*`, `escudo_url`, `endereco`, `site`, `fundada`, `cores`, `tecnico_*`, `elenco (jsonb)`, `staff (jsonb)`, `competicoes (jsonb)`, `api_payload (jsonb)`, `ultima_atualizacao`, `atualizado_em`.
RLS: leitura para autenticados.

### `app_config`
**Novo (migration 20260611200000).** Configurações visuais da aplicação (logo, banner, tamanhos).
Colunas: `chave (text PK)`, `valor (text)`, `atualizado_em`.
Chaves existentes: `logo_url`, `logo_size`, `logo_header_size`, `header_banner_url`.
RLS: leitura pública (`anon` + `authenticated`); escrita somente admin (verifica `profiles.role = 'admin'`).
Nota: leitura por `anon` permite que a tela de login carregue a logo antes da autenticação.

### View `ranking`
Calculada em tempo real sobre `palpites` e `partidas`.
Colunas: `usuario_id`, `jogos_pontuados`, `pontos`.
Pontuação: 3 pts placar exato, 1 pt resultado correto.

## Edge Functions

- `supabase/functions/atualizar-placares/`: sincroniza partidas e seleções via football-data.org. Parâmetro `?seed=true` faz upsert inicial de partidas + seleções.
- `supabase/functions/create-managed-user/`: cria usuários gerenciados (admin only).

## Estrutura Principal de Rotas e Componentes

### Rotas

- `src/routes/__root.tsx`: layout raiz, metadados, stylesheet global, `QueryClientProvider`, boundaries de 404 e erro.
- `src/routes/index.tsx`: **experiência principal da família** — autenticação, palpites, comentários, chaveamento, admin panel. Ver seção abaixo.
- `src/routes/copa.tsx`: experiência alternativa com partidas do Supabase, palpites e ranking em tempo real.
- `src/routeTree.gen.ts`: arquivo gerado. Não editar manualmente.

### Componentes (`src/components/vivicopa/`)

- **`Header.tsx`**: header sticky. Lê `logo_url`, `logo_header_size` e `header_banner_url` do `localStorage` (populado pela `app_config` do Supabase). Reage ao evento customizado `vivicopa:logo-changed`. Quando banner está ativo, aplica como `background-image` no `<header>` com overlay gradiente; título e subtítulo escalam proporcionalmente ao `logoHeaderSize`. Sem banner mantém visual branco/blur original.
- **`ChaveamentoAutomatico.tsx`**: chaveamento mata-mata lido do Supabase em tempo real via Realtime. Suporta modo simulação (toggle salvo em `localStorage`). Mapa de nomes de países para IDs de bandeiras via `TIME_ID_POR_NOME`.
- **`PredictionModal.tsx`**: modal de palpite + comentário. Agora recebe `userId` e `username` como props (usuário autenticado). Salva/atualiza em `palpites_familia` via Supabase async. Remove o campo manual de nome.
- **`GameCard.tsx`**: card de jogo para listagem.
- **`Footer.tsx`**: rodapé.

### Lib (`src/lib/`)

- **`storage.ts`**: interface `Palpite` (campos camelCase para UI) + funções async Supabase para `palpites_familia`. Mappers `dbRowToPalpite` / `palpiteToDbRow` fazem a conversão entre snake_case do DB e camelCase da UI.
- **`auth.ts`**: helpers `isValidUsername`, `normalizeUsername`, `usernameToEmail` (monta email fake para auth Supabase com username).
- **`flags.ts`**: `flagUrl(id, size)` e `flagAlt(id)` — URLs de bandeiras via `flagcdn.com`.

## Fluxo de Persistência — Dados Críticos

| Dado | Tabela Supabase | Observação |
|---|---|---|
| Palpites família | `palpites_familia` | Upsert por `(usuario_id, jogo_id)` |
| Comentários | `palpites_familia.comentario` | Campo do próprio palpite |
| Logo / Banner | `app_config` | Valor pode ser URL HTTPS ou data URL (base64) |
| Tamanhos logo/header | `app_config` | `logo_size` (px login) e `logo_header_size` (px header) |
| Palpites copa (/copa) | `palpites` | Sistema separado, referencia `partidas` |
| Partidas | `partidas` | Somente via Edge Function |
| Seleções | `selecoes` | Somente via Edge Function |

### Ciclo de vida do logo/banner

1. Admin salva no painel → `upsert` em `app_config` + atualiza `localStorage` + dispara `vivicopa:logo-changed`.
2. `Header` escuta o evento e re-renderiza imediatamente.
3. No próximo login de qualquer usuário → `carregarConfig()` em `index.tsx` busca `app_config` do Supabase, sobrescreve `localStorage` e dispara o evento.
4. `LoginScreen` busca `logo_url` e `logo_size` do Supabase via `anon` na montagem (antes de autenticar).

## Painel Admin (`AdminTab`)

Visível apenas para usuários com `profiles.role = 'admin'`. Seções:

1. **Trocar minha senha** — `supabase.auth.updateUser({ password })`.
2. **Criar usuário** — invoca Edge Function `create-managed-user`.
3. **Personalizar logo da tela de login** — upload de arquivo (base64) ou URL, slider de tamanho (40–500 px para login, 20–300 px para header), prévia ao vivo, botões "Salvar configurações" / "Remover logo".
4. **Banner atrás do título** — upload ou URL para imagem de fundo do header, prévia com overlay escuro simulado, botão "Remover banner".

## Configurações Locais (localStorage)

O `localStorage` é usado como **cache** das configurações vindas do Supabase e como estado de UI:

| Chave | Origem real | Descrição |
|---|---|---|
| `vivicopa:logo-url` | `app_config` | URL ou base64 da logo |
| `vivicopa:logo-size` | `app_config` | Tamanho da logo na tela de login (px) |
| `vivicopa:logo-header-size` | `app_config` | Tamanho da logo no header (px) |
| `vivicopa:header-banner-url` | `app_config` | URL ou base64 do banner do header |
| `vivicopa:simular-chaveamento` | UI only | Toggle de simulação do chaveamento |
| `sb-*` | Supabase SDK | Sessão de autenticação |

## GitHub Actions / CI

- `.github/workflows/pages.yml`: build com Node 22, `npm run build:pages`, SPA fallback (`404.html`), deploy no GitHub Pages.
- Build roda em cada push para `main`.
- Variáveis de ambiente do Supabase são injetadas via secrets do repositório no step `Build`.

## Cuidados

- Nunca editar `src/routeTree.gen.ts` manualmente. Rodar `npm run build` após alterar rotas.
- Antes de criar colunas/tabelas, confirmar o schema remoto e criar migration SQL em `supabase/migrations/`.
- Aplicar migrations com: `SUPABASE_ACCESS_TOKEN=<token> npx supabase db push --linked`
- Verificar status de migrations: `SUPABASE_ACCESS_TOKEN=<token> npx supabase migration list --linked`
- Se `src/routeTree.gen.ts` aparecer modificado apenas por `LF/CRLF`, restaurar antes do commit.
- A tabela `palpites_familia` usa `as never` nos tipos do cliente Supabase porque não está no tipo gerado `Database` — isso é esperado até a próxima regeneração de `types.ts`.
- `app_config` concede leitura para role `anon` — não armazenar dados sensíveis nessa tabela.
