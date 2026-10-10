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

Tudo com prefixo `VITE_` vai para o bundle público: não coloque mais nada.
