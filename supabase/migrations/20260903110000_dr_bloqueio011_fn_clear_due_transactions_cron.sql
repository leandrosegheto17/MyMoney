-- Correção de DR (BLOCKERS.md Bloqueio 011 / SECURITY-REVIEW.md Seção 1.3),
-- achado adicional durante a auditoria desta correção: o job `pg_cron`
-- `fn-clear-due-transactions` (schedule `*/15 * * * *`, comando
-- `select public.fn_clear_due_transactions();`) existe hoje no projeto real
-- (confirmado via `select * from cron.job`), mas nunca foi criado por nenhuma
-- migration deste repositório nem pelo dump schema-only (linhas de
-- `cron.job` são DADO da extensão pg_cron, não DDL — `pg_dump --schema-only`
-- não captura `cron.schedule(...)`, mesma classe de gap do BE-M-10 original,
-- que por isso já cria os próprios 2 jobs via `cron.schedule` dentro da própria
-- migration, não depende do dump). Sem esta migration, um ambiente novo
-- reconstruído só a partir de `db push` (mesmo já com
-- `20260827170841_baseline_legacy.sql` corrigido) teria a função
-- `fn_clear_due_transactions` mas nenhum agendamento chamando-a — RN-11
-- (promoção pending -> cleared) pararia de rodar silenciosamente.
--
-- `cron.schedule` com o mesmo nome de job é idempotente (substitui o job
-- existente, mesmo padrão dos 2 `cron.schedule` de BE-M-10) — seguro mesmo se
-- já existir no projeto real.
-- Rollback: supabase/migrations_down/20260903110000_dr_bloqueio011_fn_clear_due_transactions_cron.down.sql

select cron.schedule(
  'fn-clear-due-transactions',
  '*/15 * * * *',
  $$select public.fn_clear_due_transactions();$$
);
