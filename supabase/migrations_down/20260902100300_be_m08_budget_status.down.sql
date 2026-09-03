-- Rollback manual de 20260902100300_be_m08_budget_status.sql
drop function if exists public.get_budget_status(date);
