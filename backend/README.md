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
- `supabase/volume/`: seed opcional de volume (2 anos) e medição de desempenho; fora do `db reset`.

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

### Funções da API que escrevem (`volatile`)

`api.ocorrencias_mes` (e, quando existir, `api.resumo_mes`, que lista as fixas pendentes) garante
as ocorrências do mês antes de ler e por isso é `volatile`. O PostgREST só roda função `volatile`
por POST (a transação do GET é somente leitura): o cliente chama por `rpc` (POST), o padrão do
supabase-js, e nunca por GET.

## Suíte de isolamento da API

```sh
pnpm local:resetar
pnpm --filter @mymoney/testes-api test
```

Detalhes em `testes-api/README.md`.

## Funções de escrita (salvar idempotente pelo id do cliente)

O cliente gera o `uuid` do registro e chama `api.salvar_*(p_id, …)`; o reenvio com o mesmo id e os
mesmos dados devolve o mesmo id e não duplica. Padrão (invoker, `search_path = ''`):

1. `v_membro := app.membro_atual()`; nulo vira `registro_invalido`. Id ou nome vazio vira `valor_invalido`.
2. `update … where id = p_id and dono_id = v_membro` (a RLS já filtra).
3. `if not found`: `insert` com `id = p_id` (dono e lar pelos defaults) dentro de
   `begin … exception when unique_violation then raise exception 'registro_invalido'; end`.
   Id que existe mas pertence ao outro membro dá o mesmo erro de "não existe".
4. Devolve `p_id`. Dono e lar nunca vêm de parâmetro.

## Seed de volume e desempenho

`supabase/volume/` guarda a carga de 2 anos (RNF-03). Fica fora de `supabase/seeds/` para não entrar
no `db reset` nem no CI; só roda no Supabase local (`carregar.sh` recusa host que não seja
`localhost`/`127.0.0.1`). Usa `psql` da máquina ou, na falta dele, o do container do banco.

```sh
pnpm local:resetar   # banco limpo com os seeds padrão
pnpm local:volume    # ~6.000 parcelas, idempotente (ids = md5('volume-...'))
pnpm local:medir     # mediana de resumo_mes e lancamentos_mes + planos (auto_explain)
```

- `volume-2-anos.sql`: 24 meses até o mês de `app.hoje()`, 56 despesas por membro por mês
  (~80% Pix/Débito, ~20% Crédito em 2 a 12x, conjuntas e individuais, categorias variáveis e
  fixas) e 1 receita mensal por membro, tudo por `api.lancar_despesa`/`api.lancar_receita` como
  o próprio membro. Cria para Ana um Débito (`…0312`) e um Crédito (`…0313`, dia 15). Falha se o
  total de `app.parcela` sair de 5.500 a 6.500.
- `medir.sql`: 1 aquecimento + 5 execuções por consulta, mediana em ms (meta < 500 ms), e planos
  de dentro das funções; sem permissão para `LOAD 'auto_explain'`, mostra o `explain analyze` da
  seleção de `app.parcelas_mes`.
- `testes/carregar.test.sh`: trava de host do `carregar.sh` (`bash backend/supabase/volume/testes/carregar.test.sh`).

### Resultado (2026-10-10)

Postgres 16.15 local (4 vCPU Xeon 2,8 GHz, 15 GB), schema das migrations e seeds 00 a 08 com
`auth` simulado (sem Docker nem Supabase CLI), como Leandro. 5.969 parcelas: Leandro 1.476
conjuntas e 1.496 individuais; Ana 1.483 e 1.514.

| Consulta | Mediana (5 execuções) |
|---|---|
| `resumo_mes` (mês corrente) | 365 ms |
| `resumo_mes` (+3 meses, com crédito futuro) | 311 ms |
| `lancamentos_mes` (mês corrente) | 52 ms |
| `lancamentos_mes` (+3 meses) | 25 ms |

Plano de `app.parcelas_mes` dentro do resumo (auto_explain):

```text
->  Bitmap Heap Scan on parcela p  (actual time=0.212..5.795 rows=195 loops=1)
      ->  Bitmap Index Scan on parcela_lar_id_data_idx  (actual rows=997 loops=1)
            Index Cond: ((lar_id = app.lar_atual()) AND (data >= app.inicio_mes($1)))
```

Ponto de atenção: o maior custo do `resumo_mes` não é a seleção do mês, e sim `app.saldo_conta`
(~100 a 130 ms por conta), que relê `parcela_lar_id_data_idx` por lançamento. A margem para os 500 ms
é de cerca de 27%; se a medição no Supabase local passar disso, registrar e escalar ao Coordenador
(SDD §6, dívida de materialização) em vez de criar índice sem medir.
