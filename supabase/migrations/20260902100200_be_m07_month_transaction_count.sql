-- BE-M-07 — RF-MVP-06 AC3 exige "quantidade total de lançamentos registrados no
-- mês corrente" (instrumentação para o baseline de M2, RN-11 real —
-- AUDITORIA-BE-M-00.md Seção 5). Nenhuma das RPCs existentes (`get_month_provision`,
-- `get_monthly_category_summary`) retorna essa contagem — extensão aditiva
-- (nova função, não reescrita das existentes, conforme o próprio critério de
-- aceite de BE-M-07: "a RPC é estendida por migration aditiva (nova função ou
-- view), nunca reescrita destrutivamente sem revisão do CTO").

create or replace function public.get_month_transaction_count(p_month date default null)
returns integer
language sql
stable
set search_path to 'public'
as $$
  select count(*)::integer
  from public.transactions t
  where t.user_id = auth.uid()
    and t.transaction_date >= date_trunc('month', coalesce(p_month, (now() at time zone 'America/Sao_Paulo')::date))::date
    and t.transaction_date <  (date_trunc('month', coalesce(p_month, (now() at time zone 'America/Sao_Paulo')::date))::date + interval '1 month')
$$;

comment on function public.get_month_transaction_count(date) is
  'RF-MVP-06 AC3 — total de lançamentos do usuário no mês (padrão: mês corrente). '
  'Criada por BE-M-01/BE-M-07 (ADR-012, achado de auditoria: nenhuma RPC existente '
  'cobria essa contagem).';
