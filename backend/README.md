# backend

Banco e API (Supabase) rodando local via Supabase CLI. Configuração em `supabase/config.toml`.

## Pré-requisitos

Docker em execução, Node 24+ e pnpm.

## Uso

```sh
pnpm install
pnpm local:subir     # supabase start (e o Vite, se frontend/web existir)
pnpm local:resetar   # supabase db reset: recria o banco, aplica migrations e seeds
pnpm local:parar     # supabase stop (use --no-backup para apagar os volumes)
```

Copie `.env.example` para `.env` e preencha `SUPABASE_ANON_KEY` com o valor de
`pnpm exec supabase status --workdir backend`.

## Pastas

- `supabase/migrations/`: migrations (schemas e funções).
- `supabase/tests/`: testes SQL (pgTAP); rodam com `pnpm exec supabase test db --workdir backend`.
- `supabase/seeds/*.sql`: dados de desenvolvimento, aplicados no `db reset`.
- `supabase/verificacoes/`: conferência do `config.toml` contra o painel (`pnpm test:config`).

## Seeds de acesso

`supabase/seeds/01-acesso.sql` cria, só no ambiente local, o lar "Casa Leandro e Ana" e três
usuários fictícios com a mesma senha `senha-local-123`:

| E-mail | Auth id | Membro |
|---|---|---|
| `leandro@exemplo.com` | `...0000a1` | Leandro (`...000101`) |
| `ana@exemplo.com` | `...0000a2` | Ana (`...000102`) |
| `visitante@exemplo.com` | `...0000a3` | nenhum |

Os ids de Ana e do visitante não existem no mockup; `...a2` e `...a3` são convenção local. A
suíte de API lê `TESTE_EMAIL_A`, `TESTE_EMAIL_B`, `TESTE_EMAIL_SEM_MEMBRO` e `TESTE_SENHA` do
`.env` (valores em `.env.example`). Seed não vai para produção: `db push` não o aplica.

## Fonte declarativa e migrations

A fonte fica em `supabase/schemas/` (um arquivo por objeto); a migration é gerada com
`pnpm exec supabase db diff --workdir backend -f <nome>` e revisada à mão. A ordem de leitura
está em `[db.migrations] schema_paths` no `config.toml`: schemas, privilégios padrão, `app/**`,
`api/**`. O glob `**` só pega arquivos em subpastas (`schemas/app/tabelas/x.sql`); arquivo solto
direto em `schemas/app/` fica de fora, e `schema.sql` entra pelo caminho explícito.
`app/tabelas/**` é lido antes de `app/**`, e função cujo corpo SQL lê tabela (as auxiliares de RLS) mora no
arquivo da tabela: o `db diff` carrega arquivo só de função/política antes das tabelas e falha.

Com `schema_paths` definido, o `db diff` compara as migrations com os arquivos declarativos
(não com o banco local), então objeto criado direto no banco não aparece no diff.

### O que o `db diff` captura

Testado com objetos descartáveis (já removidos):

| Objeto                                  | `db diff`                                        | Ação                                                                    |
| --------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| `create schema`                         | capturado                                        |                                                                         |
| tabela, PK, `enable row level security` | capturado                                        |                                                                         |
| `create policy`                         | capturado                                        |                                                                         |
| `grant` em tabela                       | capturado                                        |                                                                         |
| view                                    | capturada, mas **sem** `security_invoker = true` | escrever a view à mão na migration com `with (security_invoker = true)` |
| `grant` em view                         | não capturado                                    | escrever à mão                                                          |
| `grant`/`revoke` em schema (`usage`)    | não capturado                                    | escrever à mão                                                          |
| `grant execute` em função               | não capturado                                    | escrever à mão                                                          |
| `alter default privileges`              | não capturado                                    | escrever à mão                                                          |

Toda migration vai dentro de `begin; … commit;`. Depois de gerar, rode `pnpm local:resetar` do zero.

Para subir o banco antes de existir o schema `api`, o PostgREST falha na checagem de saúde;
use `pnpm exec supabase start --workdir backend -x postgrest` na primeira vez.

### Privilégios padrão

Aplicados para o papel `postgres` (o que roda as migrations): função nova em `app` ou `api`
nasce sem `execute` para `public` e `anon` e **com** `execute` para `authenticated`; as funções
seguintes não repetem o `grant`. `anon` não tem `usage` em `app`; em `api` só ganha `usage` com o
`api.ping`. Grants de tabela são decididos junto do modelo de dados.
