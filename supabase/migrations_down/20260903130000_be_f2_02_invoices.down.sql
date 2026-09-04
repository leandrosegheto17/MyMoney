-- Rollback manual de 20260903130000_be_f2_02_invoices.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>
-- ATENÇÃO: reverte a atribuição automática de fatura (RN-01) e o cálculo de
-- limite disponível (RN-06) — transactions.card_invoice_id volta a não ser
-- preenchido para lançamentos novos em cartão de crédito. Só aplicar com
-- ciência explícita do risco (mesmo padrão dos demais rollbacks, G-02).
-- Também recomendado: `select cron.unschedule('be-f2-02-invoice-close');` e
-- remover a Edge Function `invoice-close` (`supabase functions delete
-- invoice-close --project-ref <project>`) — não incluído aqui por operar fora
-- do escopo de uma migration SQL.

drop function if exists public.get_credit_cards_available_limit();
drop function if exists public.close_due_invoices();
drop function if exists public.generate_upcoming_invoices();

drop trigger if exists transactions_before_update_assign_card_invoice on public.transactions;
drop trigger if exists transactions_before_insert_assign_card_invoice on public.transactions;
drop function if exists public.transactions_assign_card_invoice();

drop function if exists public.credit_cards_get_or_create_invoice(uuid, date);
drop function if exists public.credit_cards_ensure_invoice(uuid, date);
drop function if exists public.credit_card_invoice_competencia(smallint, date);
drop function if exists public.credit_card_effective_closing_date(date, smallint);

alter table public.transactions
  drop constraint if exists transactions_card_invoice_id_fkey;

drop policy if exists invoices_insert_own on public.invoices;
drop policy if exists invoices_select_own on public.invoices;

drop trigger if exists invoices_set_updated_at on public.invoices;

drop table if exists public.invoices;
drop type if exists public.invoice_status;
