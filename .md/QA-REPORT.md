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
