-- BE-F2-07 — Aviso de conta fixa a vencer (RN-05, 3 dias corridos
-- configurável) + disparo de Web Push (RF-F2-07 AC1-2). Depende de
-- `notify_user()`/`push-dispatch` (BE-F2-09, feita antes por dependência
-- real do PRD-TECNICO.md — ver nota na migration 20260903210000).
--
-- RN-05: "3 dias corridos (padrão), usuário pode configurar prazo diferente
-- por conta fixa" — `fixed_bills.alert_days_before` (nova coluna, aditiva).
--
-- Achado de desenho crítico para AC2 ("sinalizar como vencida"): o job
-- legado `fn_clear_due_transactions` (F1-BE-09, a cada 15min) promove
-- QUALQUER transaction pending -> cleared assim que transaction_date <=
-- hoje, indiscriminadamente. Para lançamento gerado por FixedBill, isso
-- colidiria com o significado de "cleared" usado por BE-F2-06/AC2 ("marcar
-- como paga") — sem distinção, uma conta fixa vencida e não paga ficaria
-- indistinguível de uma paga (as duas 'cleared'). Corrigido nesta migration
-- (CREATE OR REPLACE, mesmo precedente de BE-M-13/BE-F2-04): a promoção
-- automática passa a excluir fixed_bill_id IS NOT NULL — essas só viram
-- 'cleared' por ação explícita do usuário (PATCH, já documentado em
-- BE-F2-06). "Vencida" (AC2) fica então diretamente derivável: status=
-- pending AND transaction_date < hoje, exposto via get_fixed_bills_status.
--
-- 100% aditiva (DIR-03): ALTER TABLE ADD COLUMN, CREATE OR REPLACE FUNCTION
-- (fn_clear_due_transactions — redefinição de comportamento, não perda de
-- dado real), CREATE FUNCTION. Nenhuma linha real de public é alterada.
-- Rollback: supabase/migrations_down/20260903230000_be_f2_07_fixed_bill_due_alerts.down.sql

-- =============================================================================
-- 1. RN-05 — prazo de aviso configurável por conta fixa (padrão 3 dias).
-- =============================================================================

alter table public.fixed_bills
  add column alert_days_before smallint not null default 3
  constraint fixed_bills_alert_days_before_range check (alert_days_before between 0 and 30);

comment on column public.fixed_bills.alert_days_before is
  'RN-05 — dias corridos de antecedência para o aviso de vencimento (RF-F2-07 '
  'AC1). Padrão 3, configurável por conta fixa por decisão explícita do PRD-'
  'TECNICO.md ("usuário pode configurar prazo diferente por conta fixa").';

-- =============================================================================
-- 2. fn_clear_due_transactions (legado, F1-BE-09) — exclui lançamento de
--    conta fixa da promoção automática pending->cleared, preservando a
--    distinção "vencida" (ainda pending, passou do vencimento) vs. "paga"
--    (cleared, ação explícita do usuário — BE-F2-06 AC2).
-- =============================================================================

create or replace function public.fn_clear_due_transactions()
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  update public.transactions
  set status = 'cleared'
  where status = 'pending'
    and transaction_date <= (now() at time zone 'America/Sao_Paulo')::date
    and fixed_bill_id is null;
end;
$$;

comment on function public.fn_clear_due_transactions() is
  'F1-BE-09, redefinida por BE-F2-07: promove transactions.status de pending '
  'para cleared quando transaction_date <= hoje — EXCETO lançamento de conta '
  'fixa (fixed_bill_id IS NOT NULL), que só vira cleared por ação explícita '
  'do usuário (RF-F2-06 AC2), preservando "vencida" (pending após o '
  'vencimento) como estado distinto de "paga". SECURITY DEFINER, chamada só '
  'pelo job pg_cron fn-clear-due-transactions.';

-- =============================================================================
-- 3. "Vencida" (AC2) — derivável, não precisa de coluna/estado novo.
-- =============================================================================

create function public.get_fixed_bills_status()
returns table (
  fixed_bill_id          uuid,
  description             text,
  amount_cents            bigint,
  due_day                 smallint,
  current_transaction_id  uuid,
  current_due_date        date,
  current_status          public.transaction_status,
  is_overdue              boolean
)
language sql
stable
as $$
  select
    fb.id,
    fb.description,
    fb.amount_cents,
    fb.due_day,
    t.id,
    t.transaction_date,
    t.status,
    (t.status = 'pending' and t.transaction_date < current_date) as is_overdue
  from public.fixed_bills fb
  left join public.transactions t
    on t.fixed_bill_id = fb.id
    and date_trunc('month', t.transaction_date) = date_trunc('month', current_date)
  order by fb.description;
$$;

comment on function public.get_fixed_bills_status() is
  'RF-F2-06/RF-F2-07 AC2 — status da competência corrente por conta fixa do '
  'usuário autenticado (RLS de fixed_bills/transactions escopa às linhas '
  'próprias). is_overdue deriva de status=pending + transaction_date no '
  'passado, sem estado novo no modelo.';

-- =============================================================================
-- 4. Aviso (RF-F2-07 AC1/RN-05) — dispara notify_user() quando faltam
--    alert_days_before dias (ou menos) pro vencimento e ainda não foi pago,
--    1x por (conta fixa, competência).
-- =============================================================================

create function public.check_fixed_bill_due_alerts()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_row   record;
  v_count integer := 0;
begin
  for v_row in
    select fb.id as fixed_bill_id, fb.user_id, fb.description, t.transaction_date
    from public.fixed_bills fb
    join public.transactions t
      on t.fixed_bill_id = fb.id
      and date_trunc('month', t.transaction_date) = date_trunc('month', current_date)
    where t.status = 'pending'
      and t.transaction_date >= current_date
      and t.transaction_date <= current_date + fb.alert_days_before
  loop
    begin
      if exists (
        select 1 from public.notifications
        where type = 'fixed_bill_due'
          and related_entity_type = 'fixed_bill'
          and related_entity_id = v_row.fixed_bill_id
          and created_at >= date_trunc('month', current_date)
      ) then
        continue;
      end if;

      perform public.notify_user(
        v_row.user_id,
        'fixed_bill_due',
        format('%s vence em %s', v_row.description, to_char(v_row.transaction_date, 'DD/MM')),
        'fixed_bill',
        v_row.fixed_bill_id
      );
      v_count := v_count + 1;
    exception when others then
      raise warning 'check_fixed_bill_due_alerts: falha ao notificar conta fixa % (%): %', v_row.fixed_bill_id, v_row.description, sqlerrm;
    end;
  end loop;

  return v_count;
end;
$$;

comment on function public.check_fixed_bill_due_alerts() is
  'RF-F2-07 AC1/RN-05 — dispara notify_user() (BE-F2-09) quando faltam '
  '<= alert_days_before dias pro vencimento de uma conta fixa ainda pending, '
  '1x por (conta fixa, competência). SECURITY DEFINER: cobre conta fixa de '
  'todos os usuários. Sem Edge Function própria — pura consulta SQL, só o '
  'disparo de push (dentro de notify_user) fala com Edge Function. Retorna '
  'nº de avisos disparados nesta execução.';

select cron.schedule(
  'be-f2-07-fixed-bill-due-alerts',
  '30 6 * * *', -- diário às 06:30 UTC (fixed-bill-generate roda 06:00 — avisa só depois de gerar o lançamento do mês)
  $$select public.check_fixed_bill_due_alerts();$$
);
