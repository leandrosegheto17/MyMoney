-- Rollback manual de 20260903140000_be_f2_02_invoice_close_cron.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>

select cron.unschedule('be-f2-02-invoice-close');

drop function if exists public.trigger_invoice_close();
