-- BE-DEBT-04 — candidate_transaction.import_batch_id: ON DELETE CASCADE -> SET NULL.
-- Excluir um import_batch nunca apaga candidatos (mesmo confirmed/discarded),
-- preservando raw_payload/confirmed_at/resulting_transaction_id (trilha de
-- auditoria, RNF-08). Coluna já é nullable (captura avulsa usa NULL).
-- Migration aditiva; a 20260904170000 já aplicada não é editada.

ALTER TABLE public.candidate_transaction
  DROP CONSTRAINT candidate_transaction_import_batch_id_fkey,
  ADD CONSTRAINT candidate_transaction_import_batch_id_fkey
    FOREIGN KEY (import_batch_id) REFERENCES public.import_batch(id) ON DELETE SET NULL;
