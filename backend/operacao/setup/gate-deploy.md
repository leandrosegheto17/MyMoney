# Gate de deploy

A produção só recebe código cujos checks do workflow `CI` (`.github/workflows/ci.yml`) passaram.
O deploy continua pela integração Git da Vercel; nenhum segredo da Vercel ou do Supabase entra no
workflow.

## Checks exigidos

| Job | O que garante |
|---|---|
| `base` | lint, typecheck, Vitest, scripts de operação, gitleaks e guardas de repositório |
| `banco` | pgTAP, lint do banco e contrato de tipos em dia |
| `isolamento` | suíte de isolamento da API (um contexto nunca vê dados de outro) |
| `frontend` | build, hosts externos, e2e e axe |
| `integracao` | e2e `@integracao` contra o Supabase local |

O job `migration` entra nesta lista quando for exigido pelo gate de migrations.

## Registro do gate

- Opção usada (Deployment Checks da Vercel ou proteção da `main`): a preencher no passo manual.
- Checks exigidos configurados: a preencher no passo manual.
- Data: a preencher no passo manual.
- Conferência (`gh api repos/<dono>/<repo>/branches/main/protection` ou print das Deployment Checks): a preencher no passo manual.
- PR da prova (caso de isolamento quebrado de propósito, descartado sem merge): a preencher no passo manual.

## Regra

Desligar ou tornar opcional qualquer um dos checks acima é exceção ao GUARDRAILS e exige decisão
registrada.
