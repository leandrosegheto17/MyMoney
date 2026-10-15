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

- Opção usada: Deployment Checks da Vercel (projeto mymoney, Settings, Deployment Checks). A proteção da `main` no GitHub não foi aplicada (decisão do usuário).
- Checks exigidos: `base`, `banco`, `isolamento`, `frontend` e `integracao`.
- Data: 2026-10-15.
- Limite conhecido: o Deployment Checks age só na promoção de um deploy de produção (a partir da `main`). Um PR com check vermelho continua mergeável (`MERGEABLE`/`UNSTABLE`) e o deploy de preview é cancelado pelo Ignored Build Step, então o bloqueio não aparece em PR. A promoção para produção fica retida enquanto qualquer check exigido estiver vermelho ou ausente.
- Prova: PR descartável com o caso de contexto invertido de propósito: `isolamento` ficou vermelho (`expected 'Leandro' to be 'Ninguem'`) e os demais verdes; PR fechado sem merge e branch apagada (https://github.com/leandrosegheto17/MyMoney/pull/22). A retenção da promoção em produção não foi exercitada.

## Regra

Desligar ou tornar opcional qualquer um dos checks acima é exceção ao GUARDRAILS e exige decisão
registrada.
