# @mymoney/testes-api

Suíte de isolamento da API (Vitest + supabase-js) contra o Supabase **local**. Faz login real dos
usuários do seed (`TESTE_*` em `backend/.env.example`) e chama o schema `api`.

```sh
pnpm local:resetar
pnpm --filter @mymoney/testes-api test
```

Exporte `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `TESTE_*` (saída de `supabase status -o env`). A suíte
recusa qualquer host que não seja `localhost` ou `127.0.0.1`. Nunca use chave `service_role`.

## Ajudantes (`src/`)

`comoA()`, `comoB()`, `comoSemMembro()`, `comoAnon()`, `esperarRegistroInvalido(promessa)`,
`mesmaForma(real, exemplo)`.

## Meta-teste

`casos/_meta.test.ts` lê do catálogo (Postgres em `127.0.0.1:54322`, ou `TESTE_DATABASE_URL`, mesma
trava de host) todas as views e funções do schema `api` e falha se faltar `casos/<recurso>.test.ts`.
Regra do nome: `_` do recurso vira `-` no arquivo (`dados_lancamento` -> `dados-lancamento.test.ts`).
