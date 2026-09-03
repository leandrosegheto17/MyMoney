-- BE-M-08 — RF-MVP-07 AC2-4 / RN-04: % gasto vs. teto por orçamento, com sinal
-- de alerta (>= alert_threshold_pct, padrão 80%) e estouro (> 100%), severidade
-- maior para o estouro. Aditiva: nova função, não toca em `budget`/`transactions`.

create or replace function public.get_budget_status(p_month date default null)
returns table (
  budget_id            uuid,
  category_id          uuid,
  category_name        text,
  month                date,
  limit_cents          bigint,
  spent_cents          bigint,
  alert_threshold_pct  smallint,
  pct_spent            numeric,
  alert_level          text  -- 'none' | 'warning' | 'exceeded'
)
language sql
stable
set search_path to 'public'
as $$
  with v_bounds as (
    select
      date_trunc('month', coalesce(p_month, (now() at time zone 'America/Sao_Paulo')::date))::date as month_start,
      (date_trunc('month', coalesce(p_month, (now() at time zone 'America/Sao_Paulo')::date))::date + interval '1 month')::date as month_end
  ),
  v_spent as (
    select
      t.category_id,
      coalesce(sum(t.amount_cents), 0)::bigint as spent_cents
    from public.transactions t, v_bounds b
    where t.user_id = auth.uid()
      and t.kind = 'expense'
      and t.transaction_date >= b.month_start
      and t.transaction_date <  b.month_end
    group by t.category_id
  )
  select
    bu.id as budget_id,
    bu.category_id,
    c.name as category_name,
    bu.month,
    bu.limit_cents,
    coalesce(vs.spent_cents, 0)::bigint as spent_cents,
    bu.alert_threshold_pct,
    round((coalesce(vs.spent_cents, 0)::numeric / nullif(bu.limit_cents, 0)::numeric) * 100, 2) as pct_spent,
    case
      when coalesce(vs.spent_cents, 0) > bu.limit_cents then 'exceeded'
      when coalesce(vs.spent_cents, 0) >= (bu.limit_cents * bu.alert_threshold_pct / 100.0) then 'warning'
      else 'none'
    end as alert_level
  from public.budget bu
  join public.categories c on c.id = bu.category_id
  left join v_spent vs on vs.category_id = bu.category_id
  cross join v_bounds b
  where bu.user_id = auth.uid()
    and bu.month = b.month_start;
$$;

comment on function public.get_budget_status(date) is
  'RF-MVP-07 AC2-4, RN-04 — % gasto vs. teto por orçamento do mês, com '
  'alert_level none/warning (>= alert_threshold_pct, padrão 80%)/exceeded (> 100%). '
  'Criada por BE-M-08 (ADR-012, entidade Budget de BE-M-01).';
