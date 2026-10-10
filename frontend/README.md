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

## Regras de fronteira (lint)

`frontend/web/eslint.fronteiras.js` impõe a direção de import entre camadas, restringe `@supabase/supabase-js`
e `idb-keyval` a `dados/` e proíbe escrita direta (`.from(...).insert/update/upsert/delete`). Desligar uma
dessas regras (`eslint-disable`) exige entrada em `BLOCKERS.md`.
