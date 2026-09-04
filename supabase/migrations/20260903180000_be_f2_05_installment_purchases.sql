-- BE-F2-05 — Modelo de dados de parcelamento (`installment_purchases`,
-- SDD.md Seção 5.2, entidade ausente nº 5) + geração de 1 parcela por fatura
-- até quitação (RF-F2-04 AC1-2).
--
-- Sem Edge Function/pg_cron novo: reaproveita deliberadamente o job diário já
-- agendado em BE-F2-03 (`recurring-generate`, `be-f2-03-recurring-generate`) —
-- Recorrência e Parcelamento são o MESMO bounded context/Lote neste projeto
-- (TASK.md Seção 6.3, DIR-09), então dividir a cadência de geração em 2 jobs
-- separados seria duplicar infraestrutura sem motivo (DIR-06 "não duplicada").
-- `recurring-generate/index.ts` passa a chamar também `generate_installment_
-- transactions`, deployado nesta sessão — ver nota ao final desta migration.
--
-- RN-07 (mesma regra que já cobre RecurringTemplate, texto literal do PRD-
-- TECNICO.md cita as duas: "cancelamento/encerramento de um template de
-- recorrência OU parcelamento não apaga lançamentos já gerados"):
-- `transactions.installment_plan_id` usa ON DELETE SET NULL, nunca CASCADE.
--
-- Reaproveita RN-01 (BE-F2-02) para decidir em qual fatura cada parcela cai —
-- "geração de parcela por fatura" é literalmente credit_card_invoice_
-- competencia aplicada em sequência a partir da data da compra, 1 competência
-- por parcela (DIR-06, "uma função só").
--
-- 100% aditiva (DIR-03): CREATE TABLE, CREATE FUNCTION, CREATE TRIGGER.
-- Nenhuma linha real de public é alterada.
-- Rollback: supabase/migrations_down/20260903180000_be_f2_05_installment_purchases.down.sql

-- =============================================================================
-- 1. InstallmentPurchase (RF-F2-04, SDD.md Seção 5.2)
-- =============================================================================

create table public.installment_purchases (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  description        text not null,
  total_amount_cents bigint not null,
  installments_count smallint not null,
  category_id        uuid not null references public.categories(id),
  account_id         uuid not null references public.accounts(id),
  payment_method_id  uuid not null references public.payment_methods(id),
  purchase_date      date not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint installment_purchases_total_positive check (total_amount_cents > 0),
  constraint installment_purchases_count_min check (installments_count >= 2)
);

comment on table public.installment_purchases is
  'RF-F2-04 — compra parcelada no cartão (valor total, nº de parcelas, '
  'categoria, cartão). Criada por BE-F2-05 (SDD.md Seção 5.2, entidade ausente '
  'nº 5). "valor total ou por parcela" (AC1) é resolvido no client: o Front '
  'sempre envia total_amount_cents (se o usuário digitar "por parcela", '
  'multiplica por installments_count antes de enviar) — evita 2 campos '
  'mutuamente exclusivos na mesma linha.';

comment on column public.installment_purchases.total_amount_cents is
  'Valor total da compra. Cada parcela usa installment_amount_for(total, '
  'count, número) — divisão inteira, resto absorvido pela ÚLTIMA parcela, '
  'garante soma exata das parcelas = total.';

create trigger installment_purchases_set_updated_at
  before update on public.installment_purchases
  for each row execute function public.set_updated_at();

alter table public.installment_purchases enable row level security;

create policy installment_purchases_select_own on public.installment_purchases
  for select to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

create policy installment_purchases_insert_own on public.installment_purchases
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and exists (select 1 from public.categories c where c.id = category_id and (c.user_id = auth.uid() or c.user_id is null))
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid())
    and exists (select 1 from public.payment_methods pm where pm.id = payment_method_id and pm.user_id = auth.uid())
  );

create policy installment_purchases_update_own on public.installment_purchases
  for update to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true')
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and exists (select 1 from public.categories c where c.id = category_id and (c.user_id = auth.uid() or c.user_id is null))
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid())
    and exists (select 1 from public.payment_methods pm where pm.id = payment_method_id and pm.user_id = auth.uid())
  );

create policy installment_purchases_delete_own on public.installment_purchases
  for delete to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

-- payment_method_id precisa ser um cartão de crédito — RF-F2-04 é "Gastos
-- Parcelados NO CARTÃO", sem sentido para pix/débito/boleto/dinheiro.
create function public.installment_purchases_require_credit_card_payment_method()
returns trigger
language plpgsql
as $$
declare
  v_type public.payment_method_type;
begin
  select type into v_type from public.payment_methods where id = new.payment_method_id;
  if v_type is distinct from 'credit_card' then
    raise exception 'installment_purchases.payment_method_id deve ser uma forma de pagamento type=credit_card (RF-F2-04)'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger installment_purchases_before_insert_require_credit_card
  before insert on public.installment_purchases
  for each row execute function public.installment_purchases_require_credit_card_payment_method();

create trigger installment_purchases_before_update_require_credit_card
  before update of payment_method_id on public.installment_purchases
  for each row execute function public.installment_purchases_require_credit_card_payment_method();

-- Trava total_amount_cents/installments_count/purchase_date/payment_method_id
-- depois que a 1ª parcela já foi gerada — mudar qualquer um desses depois
-- quebraria a integridade da sequência já postada (AC2: "parcela X de N" e a
-- competência de cada parcela restante dependem desses 4 campos permanecerem
-- estáveis). category_id/account_id/description continuam sempre editáveis
-- (só afetam classificação, não a sequência em si).
create function public.installment_purchases_lock_after_first_generation()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.transactions where installment_plan_id = old.id) then
    if new.total_amount_cents is distinct from old.total_amount_cents
       or new.installments_count is distinct from old.installments_count
       or new.purchase_date is distinct from old.purchase_date
       or new.payment_method_id is distinct from old.payment_method_id
    then
      raise exception 'total_amount_cents/installments_count/purchase_date/payment_method_id não podem ser alterados depois que a 1ª parcela já foi gerada (RF-F2-04 AC2)'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger installment_purchases_before_update_lock_after_generation
  before update on public.installment_purchases
  for each row execute function public.installment_purchases_lock_after_first_generation();

-- =============================================================================
-- 2. FK de transactions.installment_plan_id -> installment_purchases.id
--    (coluna antecipada desde a Fase 1). ON DELETE SET NULL (RN-07, nunca
--    CASCADE — mesmo princípio já aplicado a recurring_rule_id em BE-F2-03).
-- =============================================================================

alter table public.transactions
  add constraint transactions_installment_plan_id_fkey
  foreign key (installment_plan_id) references public.installment_purchases(id) on delete set null;

-- =============================================================================
-- 3. Valor de cada parcela (divisão inteira, resto na última) — função pura,
--    testável isolada.
-- =============================================================================

create function public.installment_amount_for(p_total_amount_cents bigint, p_installments_count smallint, p_installment_number smallint)
returns bigint
language sql
immutable
as $$
  select (p_total_amount_cents / p_installments_count)
    + case when p_installment_number = p_installments_count
           then p_total_amount_cents - (p_total_amount_cents / p_installments_count) * p_installments_count
           else 0 end;
$$;

comment on function public.installment_amount_for(bigint, smallint, smallint) is
  'RF-F2-04 AC1 — valor de 1 parcela: divisão inteira do total pelo nº de '
  'parcelas, resto absorvido pela ÚLTIMA parcela (garante soma exata = total, '
  'sem perder/sobrar centavo por arredondamento).';

-- =============================================================================
-- 4. Geração — 1 parcela por fatura até quitação (RF-F2-04 AC1/AC2),
--    reaproveitando credit_card_invoice_competencia (RN-01, BE-F2-02): a
--    competência-alvo da parcela N é a competência da compra + (N-1) meses.
--    Usa o 1º dia do mês-alvo como transaction_date de toda parcela a partir
--    da 2ª — garante que transactions_assign_card_invoice (BE-F2-02) resolva
--    exatamente a mesma competência já calculada aqui (dia 1 é sempre <=
--    qualquer closing_day, nunca "vaza" pro mês seguinte). Parcela 1 usa a
--    data real da compra (mesma garantia, por construção).
-- =============================================================================

create function public.generate_installment_transactions()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_plan               record;
  v_card_id            uuid;
  v_closing_day        smallint;
  v_first_competencia  date;
  v_current_competencia date;
  v_target_competencia date;
  v_generated_count    integer;
  v_next_number        smallint;
  v_amount             bigint;
  v_gen_date           date;
  v_count              integer := 0;
begin
  for v_plan in select * from public.installment_purchases loop
    begin
      select credit_card_id into v_card_id
      from public.payment_methods where id = v_plan.payment_method_id;

      if v_card_id is null then
        raise warning 'generate_installment_transactions: payment_method % do plano % não referencia um cartão (dado inconsistente)', v_plan.payment_method_id, v_plan.id;
        continue;
      end if;

      select closing_day into v_closing_day from public.credit_cards where id = v_card_id;

      v_first_competencia := public.credit_card_invoice_competencia(v_closing_day, v_plan.purchase_date);
      v_current_competencia := public.credit_card_invoice_competencia(v_closing_day, current_date);

      select count(*) into v_generated_count
      from public.transactions where installment_plan_id = v_plan.id;

      while v_generated_count < v_plan.installments_count loop
        v_next_number := v_generated_count + 1;
        v_target_competencia := (v_first_competencia + make_interval(months => v_next_number - 1))::date;

        exit when v_target_competencia > v_current_competencia;

        v_amount := public.installment_amount_for(v_plan.total_amount_cents, v_plan.installments_count, v_next_number);
        v_gen_date := case when v_next_number = 1 then v_plan.purchase_date else v_target_competencia end;

        insert into public.transactions
          (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date, installment_plan_id, installment_number, description)
        values
          (v_plan.user_id, v_plan.account_id, v_plan.payment_method_id, v_plan.category_id, 'expense', v_amount, v_gen_date, v_plan.id, v_next_number, v_plan.description);

        v_generated_count := v_generated_count + 1;
        v_count := v_count + 1;
      end loop;
    exception when others then
      raise warning 'generate_installment_transactions: falha ao gerar parcela do plano % (%): %', v_plan.id, v_plan.description, sqlerrm;
    end;
  end loop;

  return v_count;
end;
$$;

comment on function public.generate_installment_transactions() is
  'RF-F2-04 AC1/AC2 — gera, por plano, toda parcela cuja competência-alvo já '
  'foi alcançada e ainda não foi gerada (loop cobre catch-up de mais de 1 '
  'parcela atrasada no mesmo run, diferente da simplificação de BE-F2-03 — '
  'aqui o total é fixo e não pode "pular" parcela). SECURITY DEFINER: cobre '
  'plano de todos os usuários. Retorna nº de parcelas geradas nesta execução.';

-- =============================================================================
-- 5. Progresso "parcela X de N" (RF-F2-04 AC2) — RLS escopa ao próprio usuário.
-- =============================================================================

create function public.get_installment_purchases_progress()
returns table (
  installment_purchase_id uuid,
  description             text,
  installments_count      smallint,
  generated_count         bigint,
  remaining_count         bigint
)
language sql
stable
as $$
  select
    ip.id,
    ip.description,
    ip.installments_count,
    count(t.id) as generated_count,
    (ip.installments_count - count(t.id))::bigint as remaining_count
  from public.installment_purchases ip
  left join public.transactions t on t.installment_plan_id = ip.id
  group by ip.id, ip.description, ip.installments_count;
$$;

comment on function public.get_installment_purchases_progress() is
  'RF-F2-04 AC2 — "quantas parcelas já foram pagas/quantas restam" por compra '
  'parcelada do usuário autenticado.';

-- =============================================================================
-- Nota operacional (não-SQL): supabase/functions/recurring-generate/index.ts
-- foi atualizado nesta sessão para também chamar generate_installment_
-- transactions() (mesmo request, mesmo segredo de cron já existente de
-- BE-F2-03 — nenhum secret/Vault novo) e redeployado via
-- `supabase functions deploy recurring-generate`. Nenhum novo `cron.schedule`
-- necessário (reaproveita be-f2-03-recurring-generate, 05:00 UTC diário).
-- =============================================================================
