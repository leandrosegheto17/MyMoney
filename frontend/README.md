# Frontend

Pacote `@mymoney/web` (`frontend/web`): SPA com Vite, React 19, TypeScript estrito, React Router e TanStack Query.

## Setup

```sh
pnpm install
cp frontend/.env.example frontend/web/.env.local   # preencha com a chave anon de `supabase status`
pnpm --filter @mymoney/web dev
```

## Comandos

```sh
pnpm --filter @mymoney/web dev        # servidor local (porta de PORTA, padrão 5173, sem trocar de porta)
pnpm --filter @mymoney/web build      # tsc + vite build
pnpm --filter @mymoney/web test       # Vitest + Testing Library
pnpm --filter @mymoney/web typecheck
```

## CI (`.github/workflows/ci.yml`)

- `base`: lint, typecheck e Vitest de todos os pacotes (os testes de componente rodam aqui).
- `frontend`: build do web, e2e e axe sem `@integracao` (Playwright, Chromium),
  `visual` sem `--tela` (só as telas de `e2e/telas-implementadas.json`, limite de 1%) e upload dos
  prints de `.md/.visual/` como artefato `visual`.
- `integracao`: sobe o Supabase local (`pnpm local:ci`) e roda `playwright test --grep @integracao`
  com a URL e a chave anon locais; nunca credencial de produção.

Reproduzir (Docker em execução para `integracao`):

```sh
pnpm --filter @mymoney/web build
pnpm --filter @mymoney/web visual
pnpm local:ci   # e, com o .env preenchido, em frontend/web:
pnpm exec playwright test --grep @integracao
```

Os jobs são exigidos antes do deploy: `backend/operacao/setup/gate-deploy.md`.

## Variáveis

| Variável                 | Uso                                                          |
| ------------------------ | ------------------------------------------------------------ |
| `VITE_SUPABASE_URL`      | URL do Supabase (https, ou http só em localhost/127.0.0.1)   |
| `VITE_SUPABASE_ANON_KEY` | Chave anon pública; chave de serviço é recusada na leitura   |
| `PORTA`                  | Porta do servidor de desenvolvimento (execuções em paralelo) |
| `VITE_MODO_COMPARACAO`   | `sessao-falsa` ou `sem-sessao`; só o `visual` define (ver abaixo) |

Tudo com prefixo `VITE_` vai para o bundle público: não coloque mais nada.

`VITE_MODO_COMPARACAO` é só do script `pnpm --filter @mymoney/web visual` (comparação com o mockup): `sem-sessao`
serve T01 e T01b; `sessao-falsa` injeta o usuário de `auth-usuario.json`, sem chamar o Auth, e fixa o "hoje" em
2026-10-09. Só existe em desenvolvimento: o build de produção falha se ela estiver definida. Não a coloque em
`.env.example`, `.env.local` nem na Vercel.

## Hospedagem (`frontend/web/vercel.json`)

Rewrite de toda rota para `/index.html` (a Vercel serve antes o arquivo que existir) e cabeçalhos de segurança:
CSP estrita (`default-src 'self'`, sem `unsafe-inline`/`unsafe-eval`, `frame-ancestors 'none'`, `connect-src` só
`'self'` e o Supabase de produção), HSTS de 2 anos, `nosniff`, `Referrer-Policy: no-referrer` e `Permissions-Policy`
restritiva. Se o projeto Supabase for recriado, troque o ref em `connect-src` e em
`backend/operacao/setup/limpeza.md` (os testes leem o ref de lá). Acrescentar host à CSP é exceção da G-20 e segue a
governança de exceções.

`pnpm --filter @mymoney/web verificar-hosts [pasta]` (depois do build) falha se o `dist/` tiver literal `http(s)://`
de host que não seja o Supabase de produção.

## Regras de fronteira (lint)

`frontend/web/eslint.fronteiras.js` impõe a direção de import entre camadas, restringe `@supabase/supabase-js`
e `idb-keyval` a `dados/` e proíbe escrita direta (`.from(...).insert/update/upsert/delete`). Desligar uma
dessas regras (`eslint-disable`) exige entrada em `BLOCKERS.md`.
