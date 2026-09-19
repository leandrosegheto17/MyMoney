-- Rollback manual de 20260918100000_be_debt_04_candidate_import_batch_set_null.sql
-- Restaura ON DELETE CASCADE (comportamento anterior).

ALTER TABLE public.candidate_transaction
  DROP CONSTRAINT candidate_transaction_import_batch_id_fkey,
  ADD CONSTRAINT candidate_transaction_import_batch_id_fkey
    FOREIGN KEY (import_batch_id) REFERENCES public.import_batch(id) ON DELETE CASCADE;
