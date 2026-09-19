-- Rollback manual de 20260918110000_be_debt_02_revoke_execute_cron_functions.sql
-- Restaura o grant default herdado do baseline. Aplicar só sob decisão explícita.

grant execute on function public.trigger_backup_export() to public, anon, authenticated;
grant execute on function public.check_backup_health() to public, anon, authenticated;
grant execute on function public.generate_upcoming_invoices() to public, anon, authenticated;
grant execute on function public.close_due_invoices() to public, anon, authenticated;
grant execute on function public.trigger_invoice_close() to public, anon, authenticated;
grant execute on function public.trigger_recurring_generate() to public, anon, authenticated;
grant execute on function public.generate_recurring_transactions() to public, anon, authenticated;
grant execute on function public.generate_installment_transactions() to public, anon, authenticated;
grant execute on function public.trigger_fixed_bill_generate() to public, anon, authenticated;
grant execute on function public.generate_fixed_bill_transactions() to public, anon, authenticated;
grant execute on function public.check_fixed_bill_due_alerts() to public, anon, authenticated;
grant execute on function public.check_budget_alerts() to public, anon, authenticated;
grant execute on function public.trigger_data_retention_purge() to public, anon, authenticated;
grant execute on function public.check_data_retention_health() to public, anon, authenticated;
