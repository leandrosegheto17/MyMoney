-- BE-DEBT-02 — Hardening sistêmico (SECURITY-REVIEW.md Seção 1.28, achado (b)):
-- funções SECURITY DEFINER de job agendado herdavam EXECUTE de PUBLIC/anon/
-- authenticated (ALTER DEFAULT PRIVILEGES do baseline), permitindo que qualquer
-- sessão as acionasse via /rest/v1/rpc/<função>. Os jobs legítimos rodam como
-- owner (pg_cron -> postgres) ou via Edge Function com service_role, que
-- mantém EXECUTE. Migration aditiva (DIR-04); nenhuma migration já aplicada
-- é editada. Inclui também trigger_data_retention_purge/
-- check_data_retention_health (BE-F3-08), mesmo padrão.
-- Rollback: supabase/migrations_down/20260918110000_be_debt_02_revoke_execute_cron_functions.down.sql

revoke execute on function public.trigger_backup_export() from public, anon, authenticated;
grant execute on function public.trigger_backup_export() to service_role;
revoke execute on function public.check_backup_health() from public, anon, authenticated;
grant execute on function public.check_backup_health() to service_role;
revoke execute on function public.generate_upcoming_invoices() from public, anon, authenticated;
grant execute on function public.generate_upcoming_invoices() to service_role;
revoke execute on function public.close_due_invoices() from public, anon, authenticated;
grant execute on function public.close_due_invoices() to service_role;
revoke execute on function public.trigger_invoice_close() from public, anon, authenticated;
grant execute on function public.trigger_invoice_close() to service_role;
revoke execute on function public.trigger_recurring_generate() from public, anon, authenticated;
grant execute on function public.trigger_recurring_generate() to service_role;
revoke execute on function public.generate_recurring_transactions() from public, anon, authenticated;
grant execute on function public.generate_recurring_transactions() to service_role;
revoke execute on function public.generate_installment_transactions() from public, anon, authenticated;
grant execute on function public.generate_installment_transactions() to service_role;
revoke execute on function public.trigger_fixed_bill_generate() from public, anon, authenticated;
grant execute on function public.trigger_fixed_bill_generate() to service_role;
revoke execute on function public.generate_fixed_bill_transactions() from public, anon, authenticated;
grant execute on function public.generate_fixed_bill_transactions() to service_role;
revoke execute on function public.check_fixed_bill_due_alerts() from public, anon, authenticated;
grant execute on function public.check_fixed_bill_due_alerts() to service_role;
revoke execute on function public.check_budget_alerts() from public, anon, authenticated;
grant execute on function public.check_budget_alerts() to service_role;
revoke execute on function public.trigger_data_retention_purge() from public, anon, authenticated;
grant execute on function public.trigger_data_retention_purge() to service_role;
revoke execute on function public.check_data_retention_health() from public, anon, authenticated;
grant execute on function public.check_data_retention_health() to service_role;
