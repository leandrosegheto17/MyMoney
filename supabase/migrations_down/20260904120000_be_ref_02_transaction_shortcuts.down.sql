-- Rollback manual de 20260904120000_be_ref_02_transaction_shortcuts.sql
drop function if exists public.get_transaction_shortcuts();
alter table public.transactions drop column if exists created_via_shortcut;
