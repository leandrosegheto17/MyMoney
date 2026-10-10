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

## RTP-0025 — QA — 2026-10-10
RTP-0025 APROVADA no QA (lint 0 erro, 9/9 testes, tsc ok); `any` residual em sessoes.ts sob disable virou RTP-0031.

## TP-0055 — QA — 2026-10-10
TP-0055 aprovada no QA (pgTAP 11/11 e 12/12 em banco descartável); 1 achado não crítico, RTP-0029 (casos testes-api com ids que não existem no seed).

## TP-0057 — QA — 2026-10-10
APROVADA; pgTAP 22/22 em banco descartável, aceite atendido; 1 achado não crítico (ids dos casos testes-api fora do seed, RTP-0028); db diff/vitest/contrato não verificados.

## TP-0060 — QA — 2026-10-10
TP-0060 aprovada no QA, pgTAP 11/11 e 13/13 e aceite cumprido no banco; testes-api/contrato não rodáveis aqui (dependem da view api.categorias do TP-0053 e do CLI).

## TP-0062 — QA — 2026-10-10
TP-0062 APROVADA no QA: pgTAP (pix, crédito, validação, idempotência, parcelas) com 0 falhas em banco descartável, critério de aceite e convenções ok; testes-api, db diff e contrato:gerar não verificados por falta de stack local.

## TP-0063 — QA — 2026-10-10
TP-0063 APROVADA no QA: pgTAP (33/34, a falha é artefato do shim) e conferência com o seed confirmam ordem por uso do próprio membro, padrões e isolamento; API/pgTAP real não verificados.

## TP-0064 — QA — 2026-10-10
TP-0064 aprovada no QA: 16/16 no pgTAP com shim mais verificações extras de crédito e troca de conta; sem achados; pgTAP real, CLI e catálogo TP-0017 não verificados.

## TP-0067 — QA — 2026-10-10
TP-0067 aprovada no QA — gasto_cartao 17/17 no banco descartável, aceite e convenções ok, sem achados; pgTAP real/supabase CLI não verificados.

## TP-0085 — QA — 2026-10-10
TP-0085 APROVADA no QA: 9/9 e 22/22 pgTAP (em shim) ok, aceite e convenções atendidos, sem achados; pgTAP real e db diff não verificados.

## TP-0086 — QA — 2026-10-10
TP-0086 aprovada no QA (25/25 + regressão 22/22 em banco descartável); 1 achado não crítico de duplicação da agregação por categoria (RTP-0030); pgTAP/supabase CLI reais não verificados.

## TP-0096 — QA — 2026-10-10
TP-0096 aprovada no QA; pgTAP 38/38 em banco descartável, aceite e convenções ok, suíte testes-api e contrato:gerar não verificados por falta de ambiente.

## TP-0097 — QA — 2026-10-10
TP-0097 aprovada no QA: pgTAP 31/31 (shim), respostas de A e B idênticas aos JSON do mockup, B sem forma/conta/data da operação, registro_invalido uniforme; pendentes só testes reais (supabase test db, testes-api, contrato:gerar).

## TP-0098 — QA — 2026-10-10
TP-0098 aprovada no QA: matriz de permissões de edição correta (18/18 no pgTAP em banco descartável), sem achados; pgTAP real, supabase CLI e catalogo.sql completo não verificados por falta de ferramenta.

## TP-0100 — QA — 2026-10-10
TP-0100 APROVADA no QA: pgTAP 15/15 em banco descartável, critério de aceite, segurança e convenções ok; testes-api (só revisão estática), db diff e contrato:gerar não verificados por falta de stack local.

## TP-0115 — QA — 2026-10-10
TP-0115 APROVADA no QA: 41 asserts pgTAP de receita e regressão de despesa com 0 falhas em banco descartável, aceite e convenções ok; testes-api, db diff e contrato:gerar não verificados por falta de stack local.

## TP-0117 — QA — 2026-10-10
TP-0117 aprovada no QA: aceite atendido em banco descartável (13/16 no shim, 3 divergências são artefato conferido à mão), sem achados; pgTAP real, catálogo completo, contrato:gerar e vitest não verificados por falta de ambiente.

## TP-0119 — QA — 2026-10-10
TP-0119 aprovada no QA: 80/80 pgTAP da tarefa, seed sem regressão nas demais suítes, sem achados; db diff, local:resetar e contrato:gerar não verificáveis sem Docker/CLI.

## TP-0135 — QA — 2026-10-10
TP-0135 aprovada no QA: 33/33 pgTAP (shim) ok, fronteiras 79,99/80/100/100,01% corretas, sem achados; pgTAP real e db diff não verificados.

## TP-0146 — QA — 2026-10-10
TP-0146 aprovada no QA: view `api.metas` com security_invoker, forma igual aos mockups, isolamento A/B/sem membro/anon e escrita recusada confirmados em banco descartável; sem achados.

## TP-0150 — QA — 2026-10-10
TP-0150 aprovada no QA (aceite CA-18.1 a 18.3/CA-17.3/RN-08/RN-09 conferido em banco descartável; testes-api e pgTAP real não executáveis aqui); 1 RTP não crítica (RTP-0032, isolamento dos testes-api).

## RTP-0022 — QA — 2026-10-10
RTP-0022 aprovada no QA — ids do seed corretos; A cria Pix e B recebe registro_invalido com dados existentes (validado em Postgres descartável; vitest não executável sem Supabase).

## RTP-0024 — QA — 2026-10-10
RTP-0024 aprovada no QA; ids do seed provados por SQL em banco descartável (A troca/volta, B recebe registro_invalido); vitest via API local não executado (sem Supabase CLI/Docker).

## RTP-0026 — QA — 2026-10-10
RTP-0026 APROVADA no QA; restricoes.sql 20/20 em banco descartável, sem regressão frente à linha de base; pgTAP real e supabase test db não verificados.

## RTP-0027 — QA — 2026-10-10
RTP-0027 aprovada no QA; o caso de B busca nome e ids das contas de A (validado em banco descartável, API real não verificável); achado baixo de prettier aberto como RTP-0038.

## RTP-0028 — QA — 2026-10-10
RTP-0028 aprovada no QA; ids do seed confirmados em banco descartável (A recebe em_uso, B registro_invalido), mutante morto; suíte via API não executável aqui.

## RTP-0029 — QA — 2026-10-10
RTP-0029 aprovada no QA; casos B/A de arquivar/excluir conta usam o id do seed e passam em SQL equivalente (vitest/stack não verificado por falta de Supabase local).

## RTP-0032 — QA — 2026-10-10
RTP-0032 aprovada no QA; a limpeza de metas restaura o seed (6/12/9, saldo -612000, A vê 5 metas) em banco descartável. A suíte completa e o shuffle não rodaram por falta de Supabase local.

## TP-0065 — QA — 2026-10-10
TP-0065 aprovada no QA; view api.contas (security_invoker, saldo de app.saldo_conta, só leitura, isolamento A/B) validada em banco descartável; vitest/PostgREST e contrato:gerar não verificáveis neste ambiente.

## TP-0066 — QA — 2026-10-10
TP-0066 aprovada no QA; pgTAP ok em banco descartável, 1 achado não crítico (ids do caso testes-api fora do seed, RTP-0033); testes-api e contrato não executáveis aqui.

## TP-0068 — QA — 2026-10-10
TP-0068 aprovada no QA: view `api.formas_pagamento` passa no pgTAP 13/13 e na emulação dos casos de API (isolamento, somente leitura, formato do mockup), sem achados; PostgREST, contrato e catálogo não verificados por falta de CLI.

## TP-0087 — QA — 2026-10-10
TP-0087 aprovada no QA (pgTAP 28/28 e 2/2 em banco descartável, isolamento A/B e formas conferidos); 1 achado baixo aberto como RTP-0034; vitest/CLI/contrato não verificados.

## TP-0099 — QA — 2026-10-10
TP-0099 APROVADA no QA (pgTAP editar_* 66/66, regressão lancar_despesa e catálogo DEFINER verdes em banco descartável com shim; testes-api e CLI Supabase não verificáveis); 1 achado não crítico aberto como RTP-0035.

## TP-0120 — QA — 2026-10-10
TP-0120 APROVADA no QA: 57/57 asserts pgTAP (shim) passam, aceite CA-11.1/11.2 e idempotência atendidos, sem achados.

## TP-0121 — QA — 2026-10-10
TP-0121 aprovada no QA: view api.despesas_fixas com security_invoker, só leitura, forma idêntica ao contrato e isolamento do lar validados em banco descartável; suíte testes-api/pgTAP reais e contrato:gerar pendentes de Supabase local.

## TP-0122 — QA — 2026-10-10
TP-0122 APROVADA no QA (pgTAP 30/30 e cenários da API reproduzidos em banco descartável); 1 achado não crítico (RTP-0036: testes-api deixa lixo e não prova a edição de B); sem pgTAP/CLI/API local reais.

## TP-0136 — QA — 2026-10-10
TP-0136 aprovada no QA: pgTAP (29) e equivalente SQL do testes-api verdes, `mesmaForma` OK nos dois exemplos, isolamento A/B e anon conferidos; não verificados pgTAP real, `contrato:gerar` e vitest contra a API local.

## TP-0158 — QA — 2026-10-10
TP-0158 aprovada no QA (pgTAP e aceite ok no banco descartável); 1 achado não crítico (erro de tipo TS2532 no caso testes-api) aberto como RTP-0037.

## RTP-0023 — QA — 2026-10-10
RTP-0023 aprovada no QA: caso de `definir_orcamento` confere via `orcamento_mes` que B vê o conjunto (7000) e não a individual de A (reproduzido por SQL em banco descartável); Vitest com API local real não verificado por falta de ambiente.

## RTP-0030 — QA — 2026-10-10
RTP-0030 aprovada no QA: função comum `app.totais_por_categoria` usada pelas duas funções, pgTAP 22/25/10 verdes (shim), saída idêntica antes e depois em volume de 2 anos, sem achados.

## RTP-0033 — QA — 2026-10-10
RTP-0033 aprovada no QA — ids do seed em ajustar-saldo.test.ts conferidos por equivalência SQL em banco descartável (A simula/ajusta/repete, B e inexistente recebem registro_invalido); vitest contra a API real não verificável no ambiente.

## RTP-0034 — QA — 2026-10-10
RTP-0034 aprovada no QA: despesa do caso de isolamento é apagada em finally e o seed volta idêntico (provado em SQL, 2 execuções); vitest real não executado por falta de API Supabase.

## RTP-0035 — QA — 2026-10-10
RTP-0035 aprovada no QA — limpeza do afterAll e asserção do editor confirmadas (seed idêntico após 2 execuções, em banco descartável com shim; vitest/API real não rodou por falta de Supabase local).

## RTP-0036 — QA — 2026-10-10
RTP-0036 aprovada no QA — limpeza do afterAll e asserção 9900 confirmadas (seed 7 após 2 execuções, em banco descartável com shim; vitest/API real não rodou por falta de Supabase local).

## RTP-0037 — QA — 2026-10-10
RTP-0037 aprovada no QA: erro TS2532 corrigido sem `!`/`as`, comportamento inalterado; typecheck do pacote ainda falha só em ocorrencias-mes (RTP-0042); caso contra API não executável aqui.

## RTP-0038 — QA — 2026-10-10
RTP-0038 aprovada no QA: prettier --check passa, diff de uma linha sem alterar asserções, sem novos erros de tsc.

## RTP-0039 — QA — 2026-10-10
RTP-0039 aprovada no QA: teto de 100000000000 centavos validado em despesa, receita, editar e check da tabela; 16/16 asserções e regressões ok em banco descartável, sem achados.

## TP-0088 — QA — 2026-10-10
TP-0088 aprovada no QA: 5.969 parcelas, resumo_mes p50 ~105 ms (p95 ~115-175) e lancamentos_mes ~13 ms contra o limite de 500 ms, índice de parcela usado; RTP-0041 (falta analyze após a carga, p95 passa de 500 ms antes do autoanalyze).

## TP-0123 — QA — 2026-10-10
TP-0123 aprovada no QA (pgTAP 23/23 em banco descartável; testes-api e contrato não executáveis aqui); 1 achado não crítico: RTP-0040 (limpeza do caso de API).

## TP-0124 — QA — 2026-10-10
TP-0124 APROVADA no QA: pgTAP 15/15 e 27/27 e resposta idêntica ao mockup; 1 achado baixo (erro de tipo no teste testes-api) aberto como RTP-0042.

## TP-0139 — QA — 2026-10-10
TP-0139 APROVADA no QA (pgTAP de orçamento 17/17, mesmaForma ok nos dois JSON); 1 achado não crítico: RTP-0043 (pgTAP de TP-0087 desatualizado, 2 casos falham).

## RTP-0040 — QA — 2026-10-10
RTP-0040 aprovada no QA — afterAll com apagarFixas confirmado (seed 7 após 2 execuções, em banco descartável com shim); vitest/API real não rodou por falta de Supabase local.

## RTP-0041 — QA — 2026-10-10
RTP-0041 aprovada no QA: analyze ao fim da carga confirmado, resumo_mes p50 ~115 ms e p95 < 150 ms logo após a carga, resumo_mes/orcamento/fixas coerentes (28/17/25 ok); não verificados Supabase CLI real, pgTAP real e carregar.test.sh.

## RTP-0042 — QA — 2026-10-10
RTP-0042 aprovada no QA: typecheck de testes-api passa e a asserção não foi enfraquecida; resumo_mes (28), resumo_mes_orcamento (17) e resumo_fixas (25) passam juntos e coerentes em banco descartável com shim de pgTAP; execução do caso via Supabase não verificável aqui.

## RTP-0043 — QA — 2026-10-10
RTP-0043 aprovada no QA: resumo_mes (28), resumo_mes_orcamento (17) e resumo_fixas (25) passam juntos e coerentes em banco descartável com shim de pgTAP; sem achados.

## TP-0125 — QA — 2026-10-10
TP-0125 aprovada no QA (pgTAP 34/34, regressão e TP-0127 coerentes); achado médio de limpeza do caso testes-api aberto como RTP-0044.

## TP-0127 — QA — 2026-10-10
TP-0127 aprovada no QA: 25/25 em resumo_fixas e resumo_mes/orcamento coerentes (28 e 17 ok), forma do contrato preservada; não verificados pgTAP real, db diff, contrato:gerar e testes-api via PostgREST.

## RTP-0044 — QA — 2026-10-10
RTP-0044 aprovada no QA; limpeza do caso pagar-ocorrencia comprovada em banco descartável (seed e totais inalterados em 2 rodadas), suíte vitest contra a API real não executável neste ambiente.

## RTP-0045 — QA — 2026-10-10
RTP-0045 aprovada no QA; janela ±12 meses atendida e 5 pgTAP do resumo verdes juntos; achado baixo aberto como RTP-0048 (testes com datas fixas); pgTAP real e Vitest não executados (sem stack).

## TP-0126 — QA — 2026-10-10
TP-0126 aprovada no QA (pgTAP 28/28, estorno de saldo/total/cartão provado); contorno de RN-06/I-20 por excluir/editar_lancamento confirmado e aberto como RTP-0046 (decisão do Coordenador).

## TP-0128 — QA — 2026-10-10
TP-0128 aprovada no QA (pgTAP 24/24 e 17/17 em shim); regra de data do cartão para a fixa (10/11 vs 10/10 literal) aguarda confirmação do Coordenador.

## TP-0151 — QA — 2026-10-10
TP-0151 aprovada no QA (metas, guardado no mês, RN-16c e isolamento ok no banco descartável; testes-api/contrato não verificados); 1 achado baixo aberto como RTP-0047.

## RTP-0046 — QA — 2026-10-10
RTP-0046 aprovada no QA: só o pagador edita/exclui pagamento de fixa (B recebe sem_permissao/registro_invalido, A segue livre), SECURITY DEFINER/grants/search_path preservados, pgTAP novo 13/13 e regressões verdes no shim.

## RTP-0047 — QA — 2026-10-10
RTP-0047 APROVADA no QA: item de meta e prazo extraídos para `app.*`, `resumo_mes` e `api.metas` idênticos antes/depois, pgTAP verde com shim (testes-api e supabase CLI não verificados).

## RTP-0048 — QA — 2026-10-10
RTP-0048 aprovada no QA: os 3 pgTAP de fixas passam com app.hoje() em 5 datas (2026-10 a 2030-12) e falhavam antes da correção; 1 achado baixo (mês sem dado de resumo-mes literal em 2030-01) aberto como RTP-0049.

## RTP-0031 — QA — 2026-10-10
RTP-0031 APROVADA no QA (lint 0 erro, tsc ok, 18/18 testes, tipo Database bate com 35 funções e 4 views do schema real, sem any/disable); view `categorias` inexistente no tipo e falta de checagem de aderência viraram RTP-0050.

## RTP-0049 — QA — 2026-10-10
RTP-0049 aprovada no QA; mês sem dado (hoje+5 anos) fica vazio com app.hoje() em 2026-10 e 2029-05, mas deriva do relógio do Node e falha se app.hoje() for deslocado a 2030-12 (baixa, aberto RTP-0051).

## RTP-0016 — QA — 2026-10-10
RTP-0016 aprovada no QA — prettier --check limpo, tsc e vitest src verdes, 22 arquivos com tokens AST idênticos (só formatação, nenhuma asserção alterada).

## RTP-0050 — QA — 2026-10-10
RTP-0050 aprovada no QA: lint, tsc e vitest verdes, verificação de aderência falha ao renomear argumento/coluna; 1 achado não crítico (ID de tarefa em comentário) aberto como RTP-0052.

## RTP-0051 — QA — 2026-10-10
RTP-0051 aprovada no QA; mês sem dado derivado de api.contexto().hoje + 5 anos devolve fixas_total 0 com app.hoje() em 2026-10-12, 2029-05-03 e 2030-12-31, sem achados.

## RTP-0052 — QA — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; só o comentário mudou, sem ID de tarefa em testes-api/src, tsc/prettier/lint verdes.

## TP-0007 — QA — 2026-10-10
APROVADA; 0 críticos, 1 não crítico (RTP-0053: 5 IDs TP-00xx em frontend/web/e2e acusados pelo grep do CI, correto); greps locais ok, actionlint/gitleaks ausentes e prova no GitHub pendentes.

## TP-0036 — QA — 2026-10-10
APROVADA; 0 críticos/0 não críticos; vitest 27/27, Playwright 8/8, visual da casca confere com o mockup, mudança do BK-0002 é de 1 linha e não enfraquece a prova do campo oculto.

## TP-0053 — QA — 2026-10-10
APROVADA; 0 críticos, 1 não crítico (RTP-0054: `...415` seed true x categorias.json false); view de 7 colunas, security_invoker, só SELECT, isolamento A/B e `pode_excluir` = `excluir_categoria` em 100% das categorias do seed, pgTAP 10/10 e regressão ok em banco descartável (PostgREST/vitest não verificados).

## TP-0138 — QA — 2026-10-10
APROVADA — 0 críticos, 0 não críticos; pgTAP (shim) copiar_orcamento 24/24 e regressão de orcamento/* verde, isolamento A/B, G-05, anon sem execute e search_path confirmados; vitest/contrato:gerar não verificados (sem API/Docker).

## RTP-0018 — QA — 2026-10-10
APROVADA; 0 críticos, 1 não crítico (nome fixo no reenvio quebra 2ª execução sem reset, RTP-0058); tsc/eslint/prettier limpos e os 3 comportamentos reproduzidos em SQL como A.

## RTP-0053 — QA — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; grep do CI vazio, typecheck e eslint verdes, diff só troca o nome da pasta de prints.

## RTP-0054 — QA — 2026-10-10
APROVADA; 0 críticos, 1 não crítico (cabeçalho do seed 07 desatualizado, RTP-0057); categorias A idênticas ao JSON nas 13 linhas, out/nov inalterados com e sem o seed novo, pgTAP idêntico nas duas bases, tsc ok.

## RTP-0055 — QA — 2026-10-10
APROVADA; 0 críticos/0 não críticos; 5 `uses:` de terceiros fixadas por SHA, conferidas por `git ls-remote` (incluindo `^{}` do pnpm), YAML válido e diff restrito às linhas `uses:`.

## TP-0008 — QA — 2026-10-10
TP-0008 devolvida: 19 testes verdes e aceite coberto, mas o passo shellcheck do CI falha (exit 123) por SC1091 em migrar.sh (1 crítico) e SC2034 em teste de outra tarefa (RTP-0056); ensaio local/gh real não verificados.

## TP-0018 — QA — 2026-10-10
APROVADA, 0 críticos e 0 não críticos; aceite verificado por leitura/estática (YAML, `test:config` 24/24, sed, grep limpo, SHAs preservados); execução real dos jobs e prova de vermelho pendentes por falta de Docker/GitHub.

## TP-0037 — QA — 2026-10-10
TP-0037 aprovada no QA: 43 vitest + 16 e2e verdes, visual conforme mockup, pilha de armadilhas sem regressão na Folha; 0 achados.

## RTP-0057 — QA — 2026-10-10
RTP-0057 aprovada no QA: só o comentário do cabeçalho mudou, descreve corretamente outubro e o orçamento ...0715 de setembro, sem ID de tarefa, e os seeds 00-08 aplicam sem erro em banco descartável (0 achados).

## RTP-0058 — QA — 2026-10-10
APROVADA, 0 críticos/0 não críticos; nome único por id, 2 execuções seguidas sem nome_repetido e controle com nome fixo falha na 2ª (SQL em banco descartável); tsc/eslint/prettier limpos.

## TP-0008 — QA — 2026-10-10
TP-0008 aprovada na rodada 3: 19 testes verdes, shellcheck -x sai 0 em migrar.sh/migrar.test.sh e ci.yml mantém SHAs/permissions/ordem; 0 críticos, 2 não críticos de outras tarefas (RTP-0056 existente, RTP-0059 aberta); ensaio local/gh real não verificados.

## TP-0019 — QA — 2026-10-10
APROVADA; 0 críticos e 0 não críticos; gerar/verificar rc 0 em banco descartável, 12 códigos de regra batem com o banco, 10 testes verdes; typecheck do pacote vermelho só por arquivos da TP-0020.

## TP-0109 — QA — 2026-10-10
APROVADA; 0 críticos, 2 não críticos (RTP-0060 `'--'` em literal esconde drop; RTP-0061 SC1091 em carregar.sh); checar-aditiva 31/31, migrar 19/19 + job-migration 2/2, ensaio [BD] 7/7 em banco descartável com shim (not null sem default falha com "contains null values" após 5969 parcelas); CLI real/CI não verificados.

## RTP-0056 — QA — 2026-10-10
APROVADA — shellcheck -x sai 0, 2+24 casos verdes, asserção segue discriminante (falha com JOBS_EXIGIDOS sem migration); 0 achados.

## RTP-0059 — QA — 2026-10-10
APROVADA — diretiva única, shellcheck -x do arquivo exit 0, ensaiar 7/7 e checar-aditiva 44/44; 0 críticos, 1 não crítico (SC1091 em host-local.test.sh mantém o passo do CI vermelho) aberto como RTP-0067.

## RTP-0060 — QA — 2026-10-10
DEVOLVIDA: 44+24 testes verdes e aceite literal cumprido, mas bypass real com tag $é$ (RTP-0069) e falha aberta sem perl (RTP-0070); 1 crítico, 1 não crítico.

## RTP-0061 — QA — 2026-10-10
APROVADA; 0 críticos, 1 não crítico (RTP-0068: CI não cobre backend/supabase/*.sh); shellcheck -x exit 0, carregar.test.sh e host-local.test.sh (48 casos) verdes, diff de 1 linha de diretiva.

## RTP-0062 — QA — 2026-10-10
APROVADA; 0 críticos/0 não críticos; reuso de exigir_host_local sem parse duplicado, 24+48+44 testes verdes, 4 casos novos falham no código antigo, 9 URLs adversariais recusadas ou legitimamente locais.

## RTP-0063 — QA — 2026-10-10
APROVADA; 0 críticos, 2 não críticos (lint no-control-regex em gerar.mjs:34 e mascararUrl com @/ crus na senha -> RTP-0071); prova: 8 URLs (porta/senha erradas, hostis, especiais) sem senha em stdout+stderr, corpus host-local 47/48 equivalente.

## RTP-0064 — QA — 2026-10-10
APROVADA — aceite e 65 casos adversariais (@, query host/hostaddr/service/options, %-encoding, case, `\`, espaço/controle, sufixo/prefixo, IPv6, multi-host, vazio) sem bypass; host-local 48/48, carregar, migrar 24/24, checar-aditiva 44/44 ok, shellcheck só os 2 SC1091 da RTP-0067; ensaiar-migration.test.sh não executado (sem Supabase/CLI real), 0 achados.

## TP-0020 — QA — 2026-10-10
APROVADA; 0 críticos, 1 não crítico (RTP-0065: `pagamento.forma` deveria aceitar null em receita); typecheck e 65 testes verdes, 15 recursos e exports conferidos, 3 exclusões do mockup justificadas, formas conferidas por leitura do SQL.

## TP-0025 — QA — 2026-10-10
TP-0025 APROVADA no QA (59/59 testes, tsc e eslint limpos, dependências ok); `pedirRedefinicao` engole limite de taxa (RTP-0066); `cliente.test.ts` sessao-falsa depende da TP-0026 (aceitável).

## RTP-0060 — QA — 2026-10-10
APROVADA (rodada 2): bypass `$é$` e variantes de dollar-quote fechados, 62+24 testes e shellcheck ok; 0 críticos, 2 não críticos (RTP-0072 perl que falha em execução aprova, RTP-0073 teste com 417 linhas); RTP-0069/0070 resolvidas.

## RTP-0065 — QA — 2026-10-10
APROVADA; 0 críticos/0 não críticos; contrato 79 testes e typechecks verdes, tipo aceita forma null conforme aceite.

## RTP-0066 — QA — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; 25 testes e tsc passando, 429/503/rede propagados e usuário inexistente neutro.

## RTP-0067 — QA — 2026-10-10
APROVADA — shellcheck -x do CI sai 0 e host-local.test.sh 48/48 verde; 0 achados.

## RTP-0068 — QA — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; find cobre operacao+supabase (21 .sh), shellcheck 0.11.0 rc=0, YAML válido.

## RTP-0071 — QA — 2026-10-10
APROVADA — 0 críticos, 0 não críticos; lint limpo sem eslint-disable, mascararUrl sem vazamento de senha com @ ou / crus, 79 testes passando.

## RTP-0074 — QA — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; migrar.test.sh 30/30 e host-local.test.sh 48/48 verdes, --db-url vazio aborta antes de git/gh/supabase.

## TP-0038 — QA — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; 21 testes + tsc + eslint verdes, textos/ícones/ordens conforme mockup e exaustividade provada.

## TP-0076 — QA — 2026-10-10
APROVADA — 0 críticos, 0 não críticos; 34 testes passando, typecheck/ESLint limpos, cache por usuário e `sair()` preservando a fila confirmados.

## TP-0077 — QA — 2026-10-10
APROVADA; 0 críticos, 2 não críticos (RTP-0076 401 vira falhou, RTP-0077 formato do fixture); 22/22 testes e typecheck limpos.

## TP-0102 — QA — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; 58 testes, typecheck e eslint verdes, aceite e convenções conferidos no diff.

## TP-0129 — QA — 2026-10-10
APROVADA; 0 achados críticos, 0 não críticos; 38 testes e typecheck passando, invalidações e networkMode 'always' verificados.

## TP-0152 — QA — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; 46 testes passando e tsc limpo, rpc tipada pelo banco.ts.

## RTP-0072 — QA — 2026-10-10
APROVADA, 0 críticos/0 não críticos; teste novo 10/10 (2/10 contra o script antigo), 62 casos atuais e migrar 30 verdes.

## RTP-0073 — QA — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; 62 casos verdes em 5 arquivos (+10 falha-fechada), lista de `ok - ` idêntica à do arquivo original, todos abaixo de 300 linhas, CI chama os 6.

## TP-0026 — QA — 2026-10-10
DEVOLVIDA — 1 crítico (teste de bundle falha: literal 'sessao-falsa' vazando via inicializarMembro.ts e teste sem NODE_ENV=production), 0 não críticos; visual 2 passadas e lista vazia ok.

## TP-0033 — QA — 2026-10-10
APROVADA, 0 críticos e 0 não críticos; 78/79 testes de rota/título/mapa passam (falha restante é do TP-0031), lint e tsc limpos, sem comparação visual (sem tela).

## TP-0069 — QA — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; 13 arquivos/106 testes passando, tsc e eslint limpos, escrita só por rpc, sem RTP.

## TP-0140 — QA — 2026-10-10
APROVADA — 0 críticos, 0 não críticos; 35 testes passando, tsc e eslint limpos, aceite do orçamento (consulta, definir/remover, copiar, invalidação) conferido no diff.

## RTP-0075 — QA — 2026-10-10
APROVADA — env mínimo ao filho provado por teste com executor injetado (35/35 passando); 0 críticos, 0 não críticos; execução contra banco real pendente (G-06).

## RTP-0076 — QA — 2026-10-10
APROVADA; 0 críticos/0 não críticos; vitest 32/32 e tsc limpo, 401/JWT para a rodada sem marcar `falhou` nem `motivo`.

## RTP-0077 — QA — 2026-10-10
APROVADA — JSON do mockup alinhado a ItemFila (criadoEm ms, sem motivo null) com teste de fixture; vitest 1/1 e tsc limpos; 0 achados.

## RTP-0078 — QA — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; 18 testes passando e tsc limpo, `lerCache` apaga só o store do cache para outro usuário e a fila é preservada.

## TP-0026 — QA — 2026-10-10
DEVOLVIDA (rodada 2) — 1 crítico (teste de bundle falha por falso positivo: literal 'sem-sessao' agora é valor legítimo de SituacaoSessao em sessao.ts; bundle real está limpo do modo), 0 não críticos.

## TP-0041 — QA — 2026-10-10
APROVADA; 0 críticos, 1 não crítico (RTP-0079: falta spec Playwright 44 px/axe e comparação visual, sem tela que use o componente); 43 testes vitest, tsc e eslint limpos, markup/CSS iguais ao mockup.

## TP-0042 — QA — 2026-10-10
APROVADA; 0 críticos, 1 não crítico (RTP-0080: testes das variantes extras); 17 testes Selo verdes, CSS fiel ao mockup; axe e comparação visual não rodados (sem tela consumidora).

## TP-0044 — QA — 2026-10-10
APROVADA, 0 críticos/0 não críticos; 23 testes e tsc OK, diff conforme aceite e convenções; axe e comparação visual pendentes (dependem das telas TP-0089).

## TP-0078 — QA — 2026-10-10
APROVADA, 0 críticos/0 não críticos; 26 testes passando (gatilhos, sessão, isolamento por dono), tsc limpo, convenções ok.

## TP-0080 — QA — 2026-10-10
APROVADA; 0 críticos, 1 não crítico (RTP-0081: botão "Depois" da vitrine reprova axe e quebra 2 testes do spec); vitest 10/10, 44 px e teclado ok, axe do componente limpo; sem comparação visual com mockup.

## RTP-0079 — QA — 2026-10-10
APROVADA; 0 críticos, 1 não crítico (RTP-0082: comparação visual pendente + título da vitrine); spec Playwright 6/6 passando (44x44, axe, setas) com chromium-1194 via config temporária.

## RTP-0080 — QA — 2026-10-10
APROVADA; 0 críticos, 0 não críticos; 24 testes verdes, variantes extras de SeloSituacao cobertas conforme o mockup.

## RTP-0081 — QA — 2026-10-10
DEVOLVIDA - ajuste da vitrine correto e axe verde, mas spec tem 2/6 falhas ("2 toques" 390 e 1440) por defeito do TP-0080 (ListaFormas.aoPerderFoco + spec clica input com pointer-events:none); 0 críticos, 2 não críticos; RTP-0083 proposta; /pw.cfg.ts vazio na raiz registrado, não apagado.

## TP-0026 — QA — 2026-10-10
APROVADA (rodada 3) — 0 críticos, 0 não críticos; teste de build e 32 testes do escopo passam, bundle real sem marcadores exclusivos do modo; 20 falhas de `src/dados` são de tarefas futuras (módulos ausentes), não regressão.

## RTP-0081 — QA — 2026-10-10
APROVADA (rodada 2) - botao-forma.spec.ts 6/6 verde (390 e 1440, axe fechado e aberto), unitários BotaoForma/ListaFormas verdes, preventDefault no mousedown não afeta teclado/foco; 0 críticos, 0 não críticos; RTP-0083 dispensada; /pw.cfg.ts vazio segue para o usuário apagar.

## RTP-0082 — QA — 2026-10-10
APROVADA (título da vitrine corrigido); 0 críticos, 1 não crítico (comparação visual do item b impossível, pois nenhuma tela usa o SeletorMes; passa para a T04a/TP-0103, exige RTP de pendência).

## RTP-0083 — QA — 2026-10-10
APROVADA — 0 críticos/0 não críticos; teste novo falha na config anterior e passa na atual (3/3 verdes).

## TP-0045 — QA — 2026-10-10
APROVADA; 0 críticos, 1 não crítico (RTP-0084: prettier em Entrar.tsx/Botao.tsx e textos de erro duplicados); vitest 42/42, e2e 6/6, visual T01 sucesso 0%, carregando <= 0,06%, erro 0% (pc e celular).

## TP-0046 — QA — 2026-10-10
APROVADA — aceite atendido; vitest 112/112, e2e 6/6, visual T01b sucesso 0,00% e erro 0,70% celular/0,20% PC; `nomeFormulario` aceito; 0 críticos, 1 não crítico (RTP-0085: foco próprio em vez de focarPrimeiroErro).

## TP-0047 — QA — 2026-10-10
DEVOLVIDA: 1 crítico (Sair de todos sem rede: supabase-js remove a sessão local, guarda leva a /entrar sem aviso e demais aparelhos não revogados) e 1 não crítico (RTP-0086, seta de "Instalar o app"); visual T14 0,01%/0,06% OK, 20/20 unitários.
