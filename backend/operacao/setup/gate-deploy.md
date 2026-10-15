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

- Opção usada: Deployment Checks da Vercel (projeto mymoney, Settings, Deployment Checks). A proteção da `main` no GitHub não foi aplicada (decisão do usuário, reavaliada e mantida em 2026-10-15: o fluxo automatizado commita direto na `main`; revisar antes da distribuição ou com mais de uma pessoa no repositório).
- Checks exigidos: `base`, `banco`, `isolamento`, `frontend` e `integracao`.
- Data: 2026-10-15.
- Limite conhecido: o Deployment Checks age só na promoção de um deploy de produção (a partir da `main`). Um PR com check vermelho continua mergeável (`MERGEABLE`/`UNSTABLE`) e o deploy de preview é cancelado pelo Ignored Build Step, então o bloqueio não aparece em PR. A promoção para produção fica retida enquanto qualquer check exigido estiver vermelho ou ausente.
- Prova: PR descartável com o caso de contexto invertido de propósito: `isolamento` ficou vermelho (`expected 'Leandro' to be 'Ninguem'`) e os demais verdes; PR fechado sem merge e branch apagada (https://github.com/leandrosegheto17/MyMoney/pull/22).
- Decisão (2026-10-15, RTP-0177): a retenção da promoção com check vermelho **não será exercitada em produção**. O usuário aceitou formalmente essa ausência: a evidência é o comportamento documentado do Deployment Checks da Vercel (promoção retida enquanto qualquer check exigido estiver vermelho ou ausente) somado à prova do PR #22 (check `isolamento` vermelho, sem promoção) e à observação dos 5 checks verdes em produção, abaixo. Provocar um deploy vermelho em produção só para o print foi descartado por risco e custo sem ganho de segurança; desligar ou contornar um check segue sendo exceção registrada (G-04, seção Regra).
- Evidência em produção (2026-10-15, deploy do merge do PR #21 a partir da `main`): a Vercel avaliou os 5 checks como `Required` e todos passaram (5 verdes, 0 vermelhos, 0 pendentes) antes de promover. Prints: `gate-deploy/vercel-config-checks.png` (configuração, Production) e `gate-deploy/vercel-deploy-checks-producao.png` (avaliação no deploy).

## Regra

Desligar ou tornar opcional qualquer um dos checks acima é exceção ao GUARDRAILS e exige decisão
registrada.
