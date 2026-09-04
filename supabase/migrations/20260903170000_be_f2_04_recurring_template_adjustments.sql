-- BE-F2-04 — Reajuste de valor de recorrência (RF-F2-03 AC1-3, RN-02):
-- aplicação prospectiva a partir de competência escolhida, histórico de
-- reajuste preservado (SDD.md Seção 5.2, campo "histórico de reajuste" de
-- RecurringTemplate, deixado de fora de propósito em BE-F2-03).
--
-- Sem Edge Function nova nesta tarefa (diferente de BE-F2-02/03) — é
-- modelagem + RLS + uma função de resolução, reaproveitada pelo job já
-- agendado de BE-F2-03 (generate_recurring_transactions). DIR-33 não se
-- aplica (nenhum código de Edge Function novo).
--
-- Desenho (RN-02 "nunca retroativamente aos já lançados", nas DUAS direções:
-- nem lançamento passado muda, nem o novo valor pode "vazar" pra antes da
-- competência escolhida):
--   `recurring_templates.amount_cents` passa a ser só o valor ORIGINAL
--   (desde start_date), imutável após a criação (trigger bloqueia UPDATE
--   direto — AC2 exige controle de "a partir de qual competência", uma
--   UPDATE direta não tem como expressar isso). Todo reajuste é uma linha
--   nova em `recurring_template_adjustments` (competência de vigência +
--   novo valor). `recurring_template_amount_for(template, competencia)` é a
--   única função que resolve "qual valor vale nesta competência" — pega o
--   reajuste mais recente com `effective_from <= competencia`, senão cai no
--   valor original. `generate_recurring_transactions` (BE-F2-03) passa a
--   chamar essa função em vez de ler `amount_cents` direto — nenhuma outra
--   mudança de comportamento da geração.
--
-- 100% aditiva (DIR-03): CREATE TABLE, CREATE FUNCTION, CREATE TRIGGER,
-- CREATE OR REPLACE FUNCTION (generate_recurring_transactions — mesmo
-- precedente de BE-M-13, redefinição de função não é "ALTER/DROP destrutivo
-- com dado real"). Nenhuma linha real de public é alterada.
-- Rollback: supabase/migrations_down/20260903170000_be_f2_04_recurring_template_adjustments.down.sql

-- =============================================================================
-- 1. Histórico de reajuste (RF-F2-03, SDD.md Seção 5.2)
-- =============================================================================

create table public.recurring_template_adjustments (
  id                    uuid primary key default gen_random_uuid(),
  recurring_template_id uuid not null references public.recurring_templates(id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  effective_from        date not null,
  amount_cents          bigint not null,
  created_at            timestamptz not null default now(),
  constraint recurring_template_adjustments_amount_positive check (amount_cents > 0),
  constraint recurring_template_adjustments_effective_from_first_of_month check (effective_from = date_trunc('month', effective_from)::date),
  constraint recurring_template_adjustments_unique unique (recurring_template_id, effective_from)
);

comment on table public.recurring_template_adjustments is
  'RF-F2-03/RN-02 — histórico de reajuste de RecurringTemplate. Cada linha diz '
  '"a partir desta competência, o valor passa a ser este" — nunca mexe em '
  'lançamento já gerado (RN-02), nem em recurring_templates.amount_cents (que '
  'permanece só o valor original). Criada por BE-F2-04.';

-- Só triggers/RLS decidem quem pode inserir onde (não há coluna user_id
-- redundante sem uso: mesmo padrão de denormalização já usado em invoices,
-- BE-F2-02, para RLS direta sem join).
alter table public.recurring_template_adjustments enable row level security;

create policy recurring_template_adjustments_select_own on public.recurring_template_adjustments
  for select to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

create policy recurring_template_adjustments_insert_own on public.recurring_template_adjustments
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and exists (
      select 1 from public.recurring_templates rt
      where rt.id = recurring_template_id and rt.user_id = auth.uid()
    )
  );

create policy recurring_template_adjustments_update_own on public.recurring_template_adjustments
  for update to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true')
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and exists (
      select 1 from public.recurring_templates rt
      where rt.id = recurring_template_id and rt.user_id = auth.uid()
    )
  );

create policy recurring_template_adjustments_delete_own on public.recurring_template_adjustments
  for delete to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

-- RF-F2-03 AC2/RN-02 — reajuste é sempre prospectivo: competência de vigência
-- nunca pode ser anterior ao mês corrente. CHECK constraint não serve aqui
-- (current_date não é IMMUTABLE); trigger é a forma correta de expressar essa
-- validação temporal.
create function public.recurring_template_adjustments_enforce_prospective()
returns trigger
language plpgsql
as $$
begin
  if new.effective_from < date_trunc('month', current_date)::date then
    raise exception 'effective_from não pode ser retroativo (RN-02/RF-F2-03 AC2) — competência mínima é o mês corrente'
      using errcode = '23514'; -- check_violation -> PostgREST mapeia para 400
  end if;
  return new;
end;
$$;

comment on function public.recurring_template_adjustments_enforce_prospective() is
  'RF-F2-03 AC2/RN-02 — bloqueia reajuste com competência de vigência no '
  'passado. Trigger (não CHECK) porque depende de current_date, não IMMUTABLE.';

create trigger recurring_template_adjustments_before_insert_prospective
  before insert on public.recurring_template_adjustments
  for each row execute function public.recurring_template_adjustments_enforce_prospective();

create trigger recurring_template_adjustments_before_update_prospective
  before update of effective_from on public.recurring_template_adjustments
  for each row execute function public.recurring_template_adjustments_enforce_prospective();

-- =============================================================================
-- 2. recurring_templates.amount_cents vira imutável após a criação — todo
--    reajuste passa exclusivamente por recurring_template_adjustments, nunca
--    por PATCH direto (só assim "a partir de qual competência" é expressável;
--    uma UPDATE direta não carrega essa informação).
-- =============================================================================

create function public.recurring_templates_reject_direct_amount_change()
returns trigger
language plpgsql
as $$
begin
  if new.amount_cents is distinct from old.amount_cents then
    raise exception 'amount_cents não pode ser alterado diretamente — use recurring_template_adjustments (RF-F2-03/RN-02)'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

comment on function public.recurring_templates_reject_direct_amount_change() is
  'RF-F2-03/RN-02 — impede reajuste "silencioso" via UPDATE direto de '
  'amount_cents, que não tem como expressar "a partir de qual competência" '
  '(AC1/AC2). Demais colunas (descrição, dia do mês, categoria/conta/forma, '
  'end_date) continuam editáveis normalmente.';

create trigger recurring_templates_before_update_reject_amount_change
  before update on public.recurring_templates
  for each row execute function public.recurring_templates_reject_direct_amount_change();

comment on column public.recurring_templates.amount_cents is
  'Valor ORIGINAL, vigente desde start_date até o 1º reajuste — imutável após '
  'a criação (BE-F2-04, ver trigger recurring_templates_before_update_reject_'
  'amount_change). Para o valor vigente numa competência qualquer, usar '
  'recurring_template_amount_for(id, competencia), nunca ler esta coluna '
  'diretamente quando houver reajuste.';

-- =============================================================================
-- 3. Resolução de valor vigente (RN-02) — única fonte de verdade, reaproveitada
--    por generate_recurring_transactions (BE-F2-03) e por qualquer leitura
--    futura (ex. Frontend consultando "quanto vale este mês" — DIR-06).
-- =============================================================================

create function public.recurring_template_amount_for(p_recurring_template_id uuid, p_competencia date)
returns bigint
language sql
stable
as $$
  select coalesce(
    (
      select rta.amount_cents
      from public.recurring_template_adjustments rta
      where rta.recurring_template_id = p_recurring_template_id
        and rta.effective_from <= date_trunc('month', p_competencia)::date
      order by rta.effective_from desc
      limit 1
    ),
    (select rt.amount_cents from public.recurring_templates rt where rt.id = p_recurring_template_id)
  );
$$;

comment on function public.recurring_template_amount_for(uuid, date) is
  'RF-F2-03/RN-02 — valor vigente de um RecurringTemplate numa competência: o '
  'reajuste mais recente cujo effective_from <= competencia, senão o valor '
  'original (recurring_templates.amount_cents). "Mais recente" é por '
  'effective_from, não por created_at — reajustes podem ser cadastrados fora '
  'de ordem cronológica de inserção.';

-- =============================================================================
-- 4. generate_recurring_transactions (BE-F2-03) passa a resolver o valor via
--    recurring_template_amount_for em vez de ler amount_cents direto — única
--    mudança de comportamento, resto da função idêntico.
-- =============================================================================

create or replace function public.generate_recurring_transactions()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_tpl      record;
  v_gen_date date;
  v_amount   bigint;
  v_count    integer := 0;
begin
  for v_tpl in
    select * from public.recurring_templates
    where start_date <= current_date
      and (end_date is null or end_date >= current_date)
  loop
    begin
      v_gen_date := public.recurring_template_generation_date(current_date, v_tpl.day_of_month);

      continue when current_date < v_gen_date;
      continue when v_gen_date < v_tpl.start_date;
      continue when v_tpl.end_date is not null and v_gen_date > v_tpl.end_date;

      if exists (
        select 1 from public.transactions
        where recurring_rule_id = v_tpl.id
          and date_trunc('month', transaction_date) = date_trunc('month', v_gen_date)
      ) then
        continue;
      end if;

      v_amount := public.recurring_template_amount_for(v_tpl.id, v_gen_date);

      insert into public.transactions
        (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date, recurring_rule_id, description)
      values
        (v_tpl.user_id, v_tpl.account_id, v_tpl.payment_method_id, v_tpl.category_id, 'expense', v_amount, v_gen_date, v_tpl.id, v_tpl.description);

      v_count := v_count + 1;
    exception when others then
      raise warning 'generate_recurring_transactions: falha ao gerar lançamento do template % (%): %', v_tpl.id, v_tpl.description, sqlerrm;
    end;
  end loop;

  return v_count;
end;
$$;

comment on function public.generate_recurring_transactions() is
  'RF-F2-02 AC1 / RF-F2-03 AC2 (BE-F2-04) — gera 1 lançamento por template '
  'ativo para a competência corrente, valor resolvido via '
  'recurring_template_amount_for (histórico de reajuste, RN-02), idempotente. '
  'SECURITY DEFINER: cobre template de todos os usuários. Retorna nº de '
  'lançamentos gerados nesta execução.';
