-- Rollback manual de 20260915090000_be_f3_09_delete_account_data.sql
-- Remove a função `delete_user_data` (e seus GRANT/REVOKE, dropados junto).
-- Nenhuma linha real de `public` é afetada por este rollback — a função só
-- é invocada explicitamente pela Edge Function `delete-account`.

drop function if exists public.delete_user_data(uuid);
