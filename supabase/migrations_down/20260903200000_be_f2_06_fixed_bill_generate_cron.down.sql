-- Rollback manual de 20260903200000_be_f2_06_fixed_bill_generate_cron.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>

select cron.unschedule('be-f2-06-fixed-bill-generate');

drop function if exists public.trigger_fixed_bill_generate();
