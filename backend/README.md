# backend

Banco e API (Supabase) rodando local via Supabase CLI. Configuração em `supabase/config.toml`.

## Pré-requisitos

Docker em execução, Node 24+ e pnpm.

## Uso

```sh
pnpm install
pnpm local:subir     # supabase start (e o Vite, se frontend/web existir)
pnpm local:resetar   # supabase db reset: recria o banco, aplica migrations e seeds
pnpm local:parar     # supabase stop (use -- --no-backup para apagar os volumes)
```

Copie `.env.example` para `.env` e preencha `SUPABASE_ANON_KEY` com o valor de
`pnpm exec supabase status --workdir backend`.

## Pastas

- `supabase/migrations/`: migrations (schemas e funções).
- `supabase/tests/`: testes SQL (pgTAP); rodam com `pnpm exec supabase test db --workdir backend`.
- `supabase/seeds/*.sql`: dados de desenvolvimento, aplicados no `db reset`.
- `supabase/verificacoes/`: conferência do `config.toml` contra o painel (`pnpm test:config`).
