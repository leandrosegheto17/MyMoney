-- BE-F2-06 — Modelo de dados de contas fixas (`fixed_bills`, SDD.md Seção
-- 5.2, entidade ausente nº 6) + geração de lançamento previsto por
-- competência (RF-F2-06 AC1-2).
--
-- DIR-33 (auditoria de Edge Function antes de código novo): `supabase
-- functions list` não mostrou nenhuma function de conta fixa pré-existente —
-- implementação nova, sem achado a registrar em `BLOCKERS.md`.
--
-- Diferente de Recorrência/Parcelamento (BE-F2-03/05, mesmo Lote/bounded
-- context, mesmo job reaproveitado): Contas Fixas é um Lote PRÓPRIO no
-- TASK.md (Seção 6.3) — Edge Function e agendamento SEPARADOS, sem
-- reaproveitar `recurring-generate` (DIR-09, nome por bounded context).
--
-- Achado de desenho (AC1/AC2): NENHUM código novo é necessário para AC2
-- ("marcar como paga, convertendo o lançamento previsto em efetivado,
-- refletido no saldo") — já é coberto por 2 mecanismos já existentes desde o
-- MVP: (a) `transactions_maintain_account_balance` já aplica o efeito no
-- saldo IMEDIATAMENTE na criação, independente do status (achado de
-- auditoria de BE-M-00/BE-M-06 — "previsto" já é provisionado no saldo desde
-- que existe, não só quando "pago"); (b) `transactions_set_status` só roda no
-- INSERT (BE-M-00/BE-M-06) — não há trigger de UPDATE recalculando status,
-- então `PATCH /transactions?id=eq.{id}` com `status=cleared` já funciona
-- como "marcar como paga" sem qualquer mudança de schema. Esta migration só
-- cobre AC1 (modelo + geração do lançamento previsto).
--
-- RN-07 (mesmo espírito já aplicado a RecurringTemplate/InstallmentPurchase,
-- embora o texto literal do PRD-TECNICO.md não enumere FixedBill — mesma
-- razão de fundo, "preserva a integridade histórica do ledger"):
-- `transactions.fixed_bill_id` usa ON DELETE SET NULL, nunca CASCADE.
--
-- 100% aditiva (DIR-03): CREATE TABLE, ALTER TABLE ADD COLUMN (fixed_bill_id
-- é coluna NOVA — diferente de recurring_rule_id/installment_plan_id/
-- card_invoice_id, que já existiam desde a Fase 1; não há coluna antecipada
-- equivalente para conta fixa no schema legado), CREATE FUNCTION. Nenhuma
-- linha real de public é alterada.
-- Rollback: supabase/migrations_down/20260903190000_be_f2_06_fixed_bills.down.sql

-- =============================================================================
-- 1. FixedBill (RF-F2-06, SDD.md Seção 5.2)
-- =============================================================================

create table public.fixed_bills (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  description       text not null,
  amount_cents      bigint not null,
  category_id       uuid not null references public.categories(id),
  account_id        uuid not null references public.accounts(id),
  payment_method_id uuid not null references public.payment_methods(id),
  due_day           smallint not null,
  start_date        date not null,
  end_date          date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint fixed_bills_amount_positive check (amount_cents > 0),
  constraint fixed_bills_due_day_range check (due_day between 1 and 31),
  constraint fixed_bills_end_not_before_start check (end_date is null or end_date >= start_date)
);

comment on table public.fixed_bills is
  'RF-F2-06 — conta fixa mensal (descrição, valor, categoria, dia de '
  'vencimento). Criada por BE-F2-06 (SDD.md Seção 5.2, entidade ausente nº 6). '
  '"end_date" permite encerrar sem excluir a definição, mesmo padrão de '
  'RecurringTemplate (BE-F2-03) — sem tarefa de CRUD separada.';

create trigger fixed_bills_set_updated_at
  before update on public.fixed_bills
  for each row execute function public.set_updated_at();

alter table public.fixed_bills enable row level security;

create policy fixed_bills_select_own on public.fixed_bills
  for select to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

create policy fixed_bills_insert_own on public.fixed_bills
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and exists (select 1 from public.categories c where c.id = category_id and (c.user_id = auth.uid() or c.user_id is null))
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid())
    and exists (select 1 from public.payment_methods pm where pm.id = payment_method_id and pm.user_id = auth.uid())
  );

create policy fixed_bills_update_own on public.fixed_bills
  for update to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true')
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and exists (select 1 from public.categories c where c.id = category_id and (c.user_id = auth.uid() or c.user_id is null))
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid())
    and exists (select 1 from public.payment_methods pm where pm.id = payment_method_id and pm.user_id = auth.uid())
  );

create policy fixed_bills_delete_own on public.fixed_bills
  for delete to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

-- =============================================================================
-- 2. transactions.fixed_bill_id — coluna NOVA (sem equivalente antecipado na
--    Fase 1), nullable, ON DELETE SET NULL (RN-07, mesmo princípio de
--    recurring_rule_id/installment_plan_id).
-- =============================================================================

alter table public.transactions
  add column fixed_bill_id uuid references public.fixed_bills(id) on delete set null;

comment on column public.transactions.fixed_bill_id is
  'BE-F2-06 — preenchido só nos lançamentos gerados automaticamente por '
  'generate_fixed_bill_transactions (RF-F2-06 AC1). NULL para lançamento '
  'manual/recorrência/parcela/nenhum. ON DELETE SET NULL (RN-07): excluir a '
  'conta fixa preserva o lançamento já gerado.';

-- =============================================================================
-- 3. Geração — 1 lançamento PREVISTO por competência (RF-F2-06 AC1), dia do
--    mês clampado (mesmo princípio de BE-F2-03/05, função própria por
--    bounded context, DIR-09). Diferente de RecurringTemplate: gera assim
--    que a competência começa (não espera o due_day chegar) — é uma
--    PREVISÃO, precisa existir com antecedência para RF-F2-07 (aviso 3 dias
--    antes, ainda não implementado) ter o que avisar. O próprio
--    transactions_before_insert_set_status (BE-M-00/06) já decide 'pending'
--    vs 'cleared' a partir de transaction_date (due_day) vs hoje — nenhuma
--    lógica de status nova necessária aqui.
-- =============================================================================

create function public.fixed_bill_generation_date(p_month date, p_due_day smallint)
returns date
language sql
immutable
as $$
  select least(
    date_trunc('month', p_month)::date + (p_due_day - 1),
    (date_trunc('month', p_month) + interval '1 month - 1 day')::date
  );
$$;

comment on function public.fixed_bill_generation_date(date, smallint) is
  'RF-F2-06 AC1 — data de vencimento real de uma conta fixa na competência de '
  'p_month, clampada ao último dia do mês (ex. due_day=31 num mês de 30 dias '
  'vence no dia 30).';

create function public.generate_fixed_bill_transactions()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_bill     record;
  v_gen_date date;
  v_count    integer := 0;
begin
  for v_bill in
    select * from public.fixed_bills
    where date_trunc('month', start_date) <= date_trunc('month', current_date)
      and (end_date is null or date_trunc('month', end_date) >= date_trunc('month', current_date))
  loop
    begin
      if exists (
        select 1 from public.transactions
        where fixed_bill_id = v_bill.id
          and date_trunc('month', transaction_date) = date_trunc('month', current_date)
      ) then
        continue;
      end if;

      v_gen_date := public.fixed_bill_generation_date(current_date, v_bill.due_day);

      insert into public.transactions
        (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date, fixed_bill_id, description)
      values
        (v_bill.user_id, v_bill.account_id, v_bill.payment_method_id, v_bill.category_id, 'expense', v_bill.amount_cents, v_gen_date, v_bill.id, v_bill.description);

      v_count := v_count + 1;
    exception when others then
      raise warning 'generate_fixed_bill_transactions: falha ao gerar lançamento da conta fixa % (%): %', v_bill.id, v_bill.description, sqlerrm;
    end;
  end loop;

  return v_count;
end;
$$;

comment on function public.generate_fixed_bill_transactions() is
  'RF-F2-06 AC1 — gera 1 lançamento por conta fixa ativa para a competência '
  'corrente, idempotente. Dated no due_day (clampado) — status pending/cleared '
  'resolvido automaticamente por transactions_before_insert_set_status, '
  'nenhuma lógica de status nova. SECURITY DEFINER: cobre conta fixa de todos '
  'os usuários. Retorna nº de lançamentos gerados nesta execução.';
