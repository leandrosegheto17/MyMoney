-- BE-F3-06 — Query de evolução patrimonial: série temporal do saldo
-- consolidado, filtrável por conta (RF-F3-05 AC1-2).
--
-- Sem tabela nova, sem Edge Function (DIR-33 não se aplica) — 1 RPC de
-- leitura agregada, mesma categoria de get_month_provision (BE-M-07,
-- fonte da mesma métrica de saldo consolidado, PRD-TECNICO.md Seção 5.1:
-- "RF-F3-05 é a mesma métrica de saldo consolidado, observada como série
-- histórica") e get_income_expense_report (BE-F2-10, mesmo padrão de
-- relatório mensal SECURITY INVOKER escopado por auth.uid()).
--
-- Desenho:
--   - Granularidade mensal e janela fixa de 6 meses (mês corrente + 5
--     anteriores, America/Sao_Paulo) — decisão de interpretação pequena
--     (RF-F3-05 AC1-2 não fixa janela/granularidade), documentada aqui:
--     reaproveita o mesmo desenho já estabelecido por BE-F2-10 para a
--     mesma família de relatório ("Relatórios & Exportação"), inclusive
--     para permitir reuso de componente de gráfico no Frontend.
--   - accounts.current_balance_cents é mantido ao vivo por
--     apply_transaction_effect (trigger transactions_maintain_account_balance,
--     baseline_legacy.sql), refletindo o efeito de TODA transação
--     (pending ou cleared, sem filtro de status — mesmo comportamento já
--     usado por get_month_provision.current_total_balance_cents,
--     BE-M-07). Para reconstruir o saldo ao final de cada mês da janela,
--     partimos do saldo atual de cada conta e REVERTEMOS (subtraímos) o
--     efeito de toda transação datada depois do fim daquele mês — mesma
--     lógica de sinal de apply_transaction_effect, replicada aqui só
--     para leitura (nenhuma escrita).
--   - Filtro por conta individual (AC2) soma só as contas selecionadas
--     (aqui, no máximo 1) em vez de todas as contas ativas do usuário;
--     como a fórmula de saldo por mês é idêntica em ambos os casos, somar
--     a série de todas as contas individuais reproduz exatamente a série
--     consolidada — coerência entre as duas visões garantida por
--     construção, não por coincidência de dado (AC2, critério de aceite
--     literal desta tarefa), provado em
--     supabase/tests/be_f3_06_net_worth_evolution.test.sql.
--   - Conta que não pertence ao usuário autenticado (ou já inativa) nunca
--     aparece em v_accounts — p_account_id alheio ou inativo produz lista
--     vazia (nenhuma linha), nunca erro nem vazamento de dado de outro
--     usuário (mesmo princípio de escopo por auth.uid() já usado em toda
--     a família de RPCs de relatório).
--   - Só contas ativas (is_active = true) entram na visão consolidada,
--     mesmo critério de get_month_provision (BE-M-07) — conta inativa não
--     compõe "saldo consolidado".
--
-- 100% aditiva (DIR-03): CREATE FUNCTION apenas. Nenhuma linha real de
-- public é alterada.
-- Rollback: supabase/migrations_down/20260909100000_be_f3_06_net_worth_evolution.down.sql

create function public.get_net_worth_evolution(p_account_id uuid default null)
returns table (
  month         date,
  balance_cents bigint
)
language sql
stable
set search_path to 'public'
as $$
  with v_bounds as (
    select
      (date_trunc('month', (now() at time zone 'America/Sao_Paulo')::date) - interval '5 months')::date as window_start,
      (date_trunc('month', (now() at time zone 'America/Sao_Paulo')::date) + interval '1 month')::date as window_end
  ),
  v_months as (
    select generate_series(b.window_start, b.window_end - interval '1 month', interval '1 month')::date as month_start
    from v_bounds b
  ),
  v_accounts as (
    select a.id, a.current_balance_cents
    from public.accounts a
    where a.user_id = auth.uid()
      and a.is_active = true
      and (p_account_id is null or a.id = p_account_id)
  ),
  v_effects as (
    -- Efeito de income/expense/transfer (saída) sobre account_id, mesmo
    -- sinal de apply_transaction_effect.
    select
      t.account_id as account_id,
      t.transaction_date as transaction_date,
      case t.kind
        when 'income'  then  t.amount_cents
        when 'expense' then -t.amount_cents
        when 'transfer' then -t.amount_cents
      end as delta
    from public.transactions t
    where t.user_id = auth.uid()
    union all
    -- Efeito de transfer (entrada) sobre destination_account_id.
    select
      t.destination_account_id as account_id,
      t.transaction_date as transaction_date,
      t.amount_cents as delta
    from public.transactions t
    where t.user_id = auth.uid()
      and t.kind = 'transfer'
      and t.destination_account_id is not null
  ),
  v_balance_per_account_month as (
    select
      vm.month_start,
      va.current_balance_cents
        - coalesce(sum(ve.delta) filter (
            where ve.transaction_date >= (vm.month_start + interval '1 month')::date
          ), 0)::bigint as balance_at_month_end
    from v_accounts va
    cross join v_months vm
    left join v_effects ve on ve.account_id = va.id
    group by va.id, va.current_balance_cents, vm.month_start
  )
  select
    month_start as month,
    sum(balance_at_month_end)::bigint as balance_cents
  from v_balance_per_account_month
  group by month_start
  order by month_start;
$$;

comment on function public.get_net_worth_evolution(uuid) is
  'RF-F3-05 AC1-2 (BE-F3-06) — série temporal do saldo consolidado, '
  'últimos 6 meses (mês corrente + 5 anteriores, America/Sao_Paulo), '
  'com filtro opcional por p_account_id (AC2). Parte de '
  'accounts.current_balance_cents (mesma fonte de get_month_provision, '
  'BE-M-07) e reverte o efeito de transações futuras à data de corte de '
  'cada mês, com o mesmo sinal de apply_transaction_effect. Só contas '
  'ativas do usuário autenticado entram na soma; p_account_id alheio ou '
  'inativo produz lista vazia, nunca erro. Somar a série de cada conta '
  'individual reproduz a série consolidada por construção (AC2).';
