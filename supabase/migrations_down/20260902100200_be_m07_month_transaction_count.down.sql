-- Rollback manual de 20260902100200_be_m07_month_transaction_count.sql
drop function if exists public.get_month_transaction_count(date);
