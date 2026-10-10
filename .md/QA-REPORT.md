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
