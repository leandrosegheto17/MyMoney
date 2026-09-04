-- Rollback manual de 20260903190000_be_f2_06_fixed_bills.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>
-- ATENÇÃO: reverte a geração automática de lançamento previsto de conta fixa
-- (RF-F2-06 AC1). Também recomendado: `select cron.unschedule('be-f2-06-
-- fixed-bill-generate');` e remover a Edge Function `fixed-bill-generate` —
-- não incluído aqui por operar fora do escopo de uma migration SQL.

drop function if exists public.generate_fixed_bill_transactions();
drop function if exists public.fixed_bill_generation_date(date, smallint);

alter table public.transactions
  drop column if exists fixed_bill_id;

drop policy if exists fixed_bills_delete_own on public.fixed_bills;
drop policy if exists fixed_bills_update_own on public.fixed_bills;
drop policy if exists fixed_bills_insert_own on public.fixed_bills;
drop policy if exists fixed_bills_select_own on public.fixed_bills;

drop trigger if exists fixed_bills_set_updated_at on public.fixed_bills;

drop table if exists public.fixed_bills;
