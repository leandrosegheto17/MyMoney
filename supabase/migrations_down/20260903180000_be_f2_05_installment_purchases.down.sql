-- Rollback manual de 20260903180000_be_f2_05_installment_purchases.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>
-- ATENÇÃO: reverte a geração automática de parcela (RF-F2-04 AC1). Também
-- reverta manualmente supabase/functions/recurring-generate/index.ts para a
-- versão anterior a BE-F2-05 (remover a chamada a
-- generate_installment_transactions) e redeploy — não incluído aqui por
-- operar fora do escopo de uma migration SQL.

drop function if exists public.get_installment_purchases_progress();
drop function if exists public.generate_installment_transactions();
drop function if exists public.installment_amount_for(bigint, smallint, smallint);

alter table public.transactions
  drop constraint if exists transactions_installment_plan_id_fkey;

drop trigger if exists installment_purchases_before_update_lock_after_generation on public.installment_purchases;
drop function if exists public.installment_purchases_lock_after_first_generation();

drop trigger if exists installment_purchases_before_update_require_credit_card on public.installment_purchases;
drop trigger if exists installment_purchases_before_insert_require_credit_card on public.installment_purchases;
drop function if exists public.installment_purchases_require_credit_card_payment_method();

drop policy if exists installment_purchases_delete_own on public.installment_purchases;
drop policy if exists installment_purchases_update_own on public.installment_purchases;
drop policy if exists installment_purchases_insert_own on public.installment_purchases;
drop policy if exists installment_purchases_select_own on public.installment_purchases;

drop trigger if exists installment_purchases_set_updated_at on public.installment_purchases;

drop table if exists public.installment_purchases;
