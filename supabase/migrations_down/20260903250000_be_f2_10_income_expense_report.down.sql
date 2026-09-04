-- Rollback manual de 20260903250000_be_f2_10_income_expense_report.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>

drop function if exists public.get_income_expense_report();
