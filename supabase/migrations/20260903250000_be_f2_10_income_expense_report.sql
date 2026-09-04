-- BE-F2-10 — Query de relatório comparativo entradas x saídas, últimos 6
-- meses (RF-F2-10 AC1-2).
--
-- Sem tabela nova, sem Edge Function (DIR-33 não se aplica) — só 1 RPC de
-- leitura agregada sobre `transactions`, já existente e RLS-protegida
-- (mesma categoria de get_month_provision/get_budget_status/
-- get_monthly_category_summary, todas SECURITY INVOKER, escopadas por
-- auth.uid() dentro da própria query).
--
-- Desenho (AC2, "nunca zero para mês inexistente"): a janela é fixa (mês
-- corrente + 5 anteriores, America/Sao_Paulo — mesmo fuso de
-- get_month_provision/get_month_transaction_count), mas o GROUP BY só
-- produz 1 linha por mês que tiver ao menos 1 lançamento não-transfer no
-- período — nenhum mês é fabricado/preenchido com zero por construção (não
-- há como esta query gerar uma linha para um mês sem lançamento real).
-- kind='transfer' é excluído (mesmo critério de get_monthly_category_summary,
-- legado/BE-M-07 — movimentação interna entre contas não é entrada nem
-- saída). status (pending/cleared) não é filtrado — mesmo critério de
-- get_monthly_category_summary, o relatório reflete o lançamento já
-- provisionado, não só o efetivado.
--
-- 100% aditiva (DIR-03): CREATE FUNCTION apenas. Nenhuma linha real de
-- public é alterada.
-- Rollback: supabase/migrations_down/20260903250000_be_f2_10_income_expense_report.down.sql

create function public.get_income_expense_report()
returns table (
  month         date,
  income_cents  bigint,
  expense_cents bigint
)
language sql
stable
set search_path to 'public'
as $$
  with v_bounds as (
    select
      (date_trunc('month', (now() at time zone 'America/Sao_Paulo')::date) - interval '5 months')::date as window_start,
      (date_trunc('month', (now() at time zone 'America/Sao_Paulo')::date) + interval '1 month')::date as window_end
  )
  select
    date_trunc('month', t.transaction_date)::date as month,
    coalesce(sum(t.amount_cents) filter (where t.kind = 'income'), 0)::bigint as income_cents,
    coalesce(sum(t.amount_cents) filter (where t.kind = 'expense'), 0)::bigint as expense_cents
  from public.transactions t, v_bounds b
  where t.user_id = auth.uid()
    and t.kind <> 'transfer'
    and t.transaction_date >= b.window_start
    and t.transaction_date <  b.window_end
  group by date_trunc('month', t.transaction_date)
  order by month asc;
$$;

comment on function public.get_income_expense_report() is
  'RF-F2-10 AC1-2 — comparativo entradas x saídas dos últimos 6 meses (mês '
  'corrente + 5 anteriores, America/Sao_Paulo). Só retorna mês com ao menos '
  '1 lançamento não-transfer (GROUP BY natural) — nunca fabrica linha com '
  'zero para mês sem dado (AC2). Exclui kind=transfer, mesmo critério de '
  'get_monthly_category_summary (legado/BE-M-07). Criada por BE-F2-10.';
