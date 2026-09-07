-- Rollback manual de 20260904170000_be_f3_00_candidate_transaction_import_batch.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>
-- ATENÇÃO: reverte o modelo de captura automatizada (candidate_transaction/
-- import_batch) e a coluna transactions.confirmed_at por completo. Qualquer
-- Transaction já criada via confirm_candidate_transaction permanece intacta
-- (a FK usa ON DELETE SET NULL, não CASCADE) — só perde o vínculo
-- (import_staging_id/confirmed_at) e o candidato de origem correspondente.

drop function if exists public.discard_candidate_transaction(uuid);
drop function if exists public.confirm_candidate_transaction(uuid, uuid, uuid, uuid, public.transaction_kind, bigint, date, text, uuid);

alter table public.transactions drop constraint if exists transactions_import_staging_id_fkey;
alter table public.transactions drop column if exists confirmed_at;

drop policy if exists candidate_transaction_delete_own_pending on public.candidate_transaction;
drop policy if exists candidate_transaction_insert_own on public.candidate_transaction;
drop policy if exists candidate_transaction_select_own on public.candidate_transaction;

drop index if exists public.candidate_transaction_import_batch_idx;
drop index if exists public.candidate_transaction_user_status_idx;

drop table if exists public.candidate_transaction;

drop type if exists public.candidate_transaction_status;

drop policy if exists import_batch_delete_own on public.import_batch;
drop policy if exists import_batch_update_own on public.import_batch;
drop policy if exists import_batch_insert_own on public.import_batch;
drop policy if exists import_batch_select_own on public.import_batch;

drop trigger if exists import_batch_set_updated_at on public.import_batch;

drop table if exists public.import_batch;

drop type if exists public.import_batch_status;
