-- Rollback manual de 20260903160000_be_f2_03_recurring_generate_cron.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>

select cron.unschedule('be-f2-03-recurring-generate');

drop function if exists public.trigger_recurring_generate();
