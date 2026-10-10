# QA-REPORT

## TP-0001 — QA — 2026-10-10
APROVADA; 0 críticos, 1 não crítico (RTP-0001: testes fora do Prettier); lint/typecheck/test/format:check/supabase/check-ignore e fixture de lint verdes.

## RTP-0001 — QA — 2026-10-10
APROVADA — 87/87 testes reformatados idênticos a Prettier(versão antiga); format:check, lint e typecheck verdes; 0 críticos, 0 não críticos.

## TP-0002 — QA — 2026-10-10
APROVADA com ressalva; 0 críticos, 2 não críticos (RTP-0002 README --no-backup, RTP-0003 prova do Docker limpo após TP-0003); 24/24 testes de config verdes e signup 422/GraphQL ausente comprovados na stack local.

## TP-0006 — QA — 2026-10-10
APROVADA; 0 críticos, 1 não crítico (RTP-0004: teste fora do typecheck); 13/13 testes, cobertura 100% de `manter-acordado.ts` medida em cópia isolada.

## TP-0021 — QA — 2026-10-10
APROVADA; 0 críticos, 1 não crítico (RTP-0005: teste de rotas lê src/ sob jsdom); as 2 falhas de rotas.test.tsx são de TP-0031 (1) e da config jsdom (1), aceite do TP-0021 cumprido; typecheck e build verdes, 14/16 testes.

## RTP-0002 — QA — 2026-10-10
APROVADA, 0 achados; README e plano de TP-0002 citam `pnpm local:parar --no-backup`, Prettier verde, edição de 1 linha em TP-0002.md aceitável.

## RTP-0004 — QA — 2026-10-10
APROVADA — typecheck cobre o teste sem TS2345, 13/13, lock coerente com frozen-lockfile; 0 achados.

## RTP-0005 — QA — 2026-10-10
APROVADA; 0 achados; rotas.test.tsx sem erro de import.meta.url (2 verdes, 1 falha esperada de TP-0031); plugin só no projeto de testes, sem efeito em build.

## TP-0003 — QA — 2026-10-10
APROVADA — pgTAP 00-privilegios 10/10 após reset do zero, ACL de app/api e default privileges conferidos no catálogo; 0 achados críticos, 0 não críticos.

## TP-0022 — QA — 2026-10-10
DEVOLVIDA — 21/21 testes e pnpm lint verdes e aceite cumprido, mas 1 crítico: `pnpm install --frozen-lockfile` sai com exit 1 (ERR_PNPM_IGNORED_BUILDS unrs-resolver; `allowBuilds` com placeholder em pnpm-workspace.yaml), quebrando o CI; 0 não críticos.

## TP-0023 — QA — 2026-10-10
DEVOLVIDA — tokens.css do web difere do mockup (reformatado pelo Prettier), teste de hash falha (1 crítico, 0 não críticos); build, fontes, ícones e prova visual OK.

## TP-0024 — QA — 2026-10-10
APROVADA; 0 críticos, 1 não crítico (RTP-0007: cobertura 94% de linhas, throw de centavos/mes sem teste); 58/58 dos testes da tarefa verdes (UTC/Tokyo incluídos), 48 falhas restantes na pasta são de TP-0040/0041/0101/0103 e posteriores, fora do aceite.

## TP-0027 — QA — 2026-10-10
DEVOLVIDA — e2e PWA (SW/offline/installability/axe) e demais vitest verdes, mas 1 crítico: lerToken.test falha (token `#10141a` minúsculo vs esperado `#10141A`); 0 não críticos.

## TP-0022 — QA — 2026-10-10
APROVADA (rodada 2) — install limpo com --frozen-lockfile exit 0 (unrs-resolver: false), pnpm lint verde, 21/21 testes de lint, aceite cumprido; 0 críticos, 0 não críticos.

## TP-0023 — QA — 2026-10-10
APROVADA (Rodada 2) — tokens.css idêntico ao mockup e ignorado pelo Prettier; 12/12 testes, build, format:check, lint verdes; prova visual conferida (0 críticos, 0 não críticos).

## TP-0027 — QA — 2026-10-10
APROVADA (rodada 2) — QA-1 corrigido (tokens.css `#10141A`); vitest 15/15, e2e PWA 2/2, format/lint limpos; 0 críticos, 0 não críticos.

## RTP-0003 — QA — 2026-10-10
APROVADA, 0 achados; prova do Docker limpo (parar sem backup, subir, resetar) repetida: REST api 200, signup 422 signup_disabled, GraphQL só api.

## RTP-0007 — QA — 2026-10-10
RTP-0007 APROVADA; erros.test.ts novo prova os 4 RangeError, cobertura de linhas v8 medida de centavos/mes/moeda/data = 100% (com data.lancamentos para formatarDataCurta); 0 achados; falhas restantes da pasta são de módulos de tarefas futuras, fora do aceite.

## TP-0004 — QA — 2026-10-10
APROVADA — 0 críticos/0 não críticos; reset com migrations reais ok (ordem vs TP-0013 sem conflito), 43 pgTAP verdes, migration idêntica aos schemas.

## TP-0013 — QA — 2026-10-10
APROVADA — reset do zero + pgTAP acesso (estrutura/limites/auxiliares/visibilidade) e 00-privilegios verdes; 0 achados críticos, 0 não críticos (seed.sql é do TP-0014).

## TP-0005 — QA — 2026-10-10
APROVADA; 0 achados (críticos 0, não críticos 0); reset do zero + 20 testes pgTAP PASS, migration idêntica ao schema; curl sem apikey = 200 é comportamento do gateway local, fora do aceite.

## RTP-0008 — QA — 2026-10-10
RTP-0008 aprovada no QA; lint cobre import()/require() dinâmico e `.from()` em variável, 27 testes e pnpm lint verdes; falso positivo em `Uint8Array.from` aberto como RTP-0012.

## TP-0014 — QA — 2026-10-10
TP-0014 aprovada no QA; seed validado em Postgres descartável (1 lar, 2 membros, 3 usuários, senha confere); resetar/pgTAP/login real/gitleaks ficaram sem verificação por falta de Docker/CLI.

## TP-0015 — QA — 2026-10-10
TP-0015 aprovada no QA, 16/16 asserções pgTAP (shim) ok, aceite e convenções conferidos; reset/pgTAP real pendentes no CI.

## TP-0017 — QA — 2026-10-10
TP-0017 aprovada no QA, 10 asserções do catálogo e a do 01-anon passam com shim de pgTAP e 11 provas de falha ficam vermelhas; pgTAP real não verificado.

## TP-0032 — QA — 2026-10-10
TP-0032 aprovada no QA: 17 testes unitários e 3 e2e passando, axe e alvos de 44 px ok, comparação visual igual ao mockup, sem achados.

## TP-0034 — QA — 2026-10-10
TP-0034 aprovada no QA: 44 testes unitários e 6 e2e (axe, alvos 44 px, foco no 1º erro, estado salvando) passam, visual confere com o mockup, sem achados.

## TP-0035 — QA — 2026-10-10
TP-0035 aprovada no QA: 21/21 unitários, 6/6 e2e, axe e visual conferidos, sem achados.

## TP-0039 — QA — 2026-10-10
TP-0039 aprovada no QA (20 testes e axe ok); 1 achado não crítico (spec e2e espelha markup em vez de usar componentes reais) aberto como RTP-0010.

## TP-0043 — QA — 2026-10-10
TP-0043 aprovada no QA (26 testes, alturas 64/44, 3 colunas a 390/320, axe limpo); 1 achado baixo em RTP-0009 (foco no grupo com erro e CSS duplicado).

## TP-0048 — QA — 2026-10-10
TP-0048 aprovada no QA: 35 asserções pgTAP (conta, movimento_conta, catálogo) e seed passam em shim local; sem achados; reconferir no CI com Docker.

## TP-0050 — QA — 2026-10-10
TP-0050 aprovada no QA: 22 asserções pgTAP (categoria) e 10 do catálogo passam em shim local, seed idempotente e RLS ok; sem achados; reconferir `local:resetar`/pgTAP real/contrato no CI com Docker.

## TP-0061 — QA — 2026-10-10
TP-0061 aprovada no QA, 25/25 asserções do plano ok em banco descartável com shim de pgTAP, sem achados; pgTAP real/reset/contrato não verificáveis aqui.

## TP-0079 — QA — 2026-10-10
TP-0079 aprovada no QA (11/11 testes verdes, aceite atendido); 1 achado não crítico (keyframes girar duplicado) -> RTP-0011; visual/Playwright não aplicáveis ainda.

## RTP-0009 — QA — 2026-10-10
RTP-0009 aprovada no QA, foco do erro no rádio e composes do Campo.module.css atendidos, 58 testes verdes, visual não aplicável.

## RTP-0010 — QA — 2026-10-10
RTP-0010 aprovada no QA, 4/4 testes e axe sem violação grave, prints conferidos, sem achados.

## RTP-0011 — QA — 2026-10-10
RTP-0011 aprovada no QA; giro unificado em Giro.module.css, 22 testes verdes, achado baixo aberto como RTP-0019.

## RTP-0012 — QA — 2026-10-10
RTP-0012 aprovada no QA; testes de lint 30/30 verdes, falsos positivos de X.from() eliminados e detecção de RTP-0008 preservada (pnpm lint global falha só por erros alheios).

## RTP-0013 — QA — 2026-10-10
RTP-0013 APROVADA no QA: regra de security definer por assinatura verificada (overload vermelho, 2 auxiliares verdes, catalogo.sql 10/10 com shim de pgTAP); 1 achado baixo (comentário cita "Lote 19") aberto como RTP-0020.

## TP-0016 — QA — 2026-10-10
TP-0016 aprovada no QA (18 unitários e meta-teste verdes em banco descartável, incluindo prova de falha); integração com login real não verificável aqui; 1 achado baixo -> RTP-0016 (Prettier).

## TP-0040 — QA — 2026-10-10
TP-0040 aprovada no QA, 41 testes verdes, aceite atendido; falta teste unitário de Esqueleto/EstadoVazio/LinhaVazia e axe (RTP-0015, baixa).

## TP-0049 — QA — 2026-10-10
TP-0049 APROVADA no QA; pgTAP (shim) 26/26 + 7/7 e regressões 16/16, 19/19, 10/10 passam; sem RTP; local:resetar, supabase CLI e pgTAP real não verificados.

## TP-0052 — QA — 2026-10-10
TP-0052 APROVADA no QA: pgTAP 19/19 e cenários extras (rename/arquivo/exclusão não recriam, B isolado, anon negado) ok; 1 achado baixo (lista duplicada no seed) em RTP-0017.

## TP-0054 — QA — 2026-10-10
TP-0054 aprovada no QA; pgTAP 19/19 em banco descartável, aceite e segurança conferidos, sem achados; contrato/testes-api/catalogo pendentes de CI.

## TP-0059 — QA — 2026-10-10
TP-0059 aprovada no QA (pgTAP 30/30 em banco descartável); 1 achado baixo aberto como RTP-0018 (caso testes-api sem mesmaForma/dependente da view TP-0053); testes-api e contrato não verificáveis no ambiente.

## TP-0134 — QA — 2026-10-10
TP-0134 aprovada no QA: tabela app.orcamento com restrições, unicidade, RLS e seed validados (pgTAP shim 29/29); pendente só conferência em CI com Docker.

## TP-0144 — QA — 2026-10-10
TP-0144 APROVADA no QA: RLS, checks, FK composto e seed 08 conferem com o aceite (banco descartável com shim); pgTAP real, local:resetar e contrato:gerar não verificáveis neste ambiente.

## RTP-0014 — QA — 2026-10-10
RTP-0014 aprovada no QA (34 testes de lint verdes, fixtures novas falham e negativos seguem limpos); lint global vermelho por 2 erros alheios, aberta RTP-0025.

## RTP-0015 — QA — 2026-10-10
RTP-0015 aprovada no QA; 15 testes unitários e axe e2e passam, sem achados.

## RTP-0017 — QA — 2026-10-10
RTP-0017 aprovada no QA: seed de categorias sem lista duplicada, 21 categorias com ids idênticos aos anteriores (verificado em banco descartável), 24/24 verificações; pgTAP 19/19 e local:resetar não executáveis no ambiente.

## RTP-0019 — QA — 2026-10-10
RTP-0019 aprovada no QA; classe morta removida, Botao 13/13 verdes, tsc/eslint limpos, sem achados.

## RTP-0020 — QA — 2026-10-10
RTP-0020 aprovada no QA; comentário sem citação de lote, lógica da asserção inalterada, sem achados.

## RTP-0021 — QA — 2026-10-10
RTP-0021 aprovada no QA; update por coluna impede B de mudar escopo/dono/lar da conjunta (26/26 no shim), sem achados.

## TP-0051 — QA — 2026-10-10
QA aprovou TP-0051 (tabelas lancamento, lancamento_pagamento e parcela): 58 asserções pgTAP e ataques de RLS ok em banco descartável; sem achados; pgTAP real, db reset e contrato:gerar pendentes de CI.

## TP-0056 — QA — 2026-10-10
TP-0056 aprovada no QA (pgTAP 34/34 em banco descartável, aceite atendido); 1 achado não crítico no caso testes-api (ids fora do seed) aberto como RTP-0022.

## TP-0058 — QA — 2026-10-10
TP-0058 aprovada no QA (pgTAP 15/15 em banco descartável, aceite atendido); 1 achado não crítico em RTP-0024 (ids do caso testes-api não existem no seed).

## TP-0137 — QA — 2026-10-10
TP-0137 APROVADA no QA — pgTAP 25/25 em banco descartável, aceite atendido; RTP-0023 (asserção via orcamento_mes no testes-api, após TP-0136); CLI/Docker/testes-api não verificados.

## TP-0145 — QA — 2026-10-10
TP-0145 aprovada no QA, 20/20 pgTAP (shim) ok em banco descartável, sem achados.

## TP-0147 — QA — 2026-10-10
TP-0147 aprovada no QA: 14/14 pgTAP (shim) e resposta idêntica ao JSON de exemplo; testes-api e CLI Supabase não executados no ambiente.

## TP-0148 — QA — 2026-10-10
TP-0148 aprovada no QA — aceite atendido (pgTAP 13/13, seed 08 e isolamento A/B verificados no banco descartável), sem achados; stack Supabase/PostgREST/pgTAP real não verificados.

## TP-0149 — QA — 2026-10-10
TP-0149 APROVADA no QA: pgTAP 32/32 em banco descartável, aceite e convenções OK, sem achados; stack Supabase/API, db diff e contrato:gerar não verificados.
