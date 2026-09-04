-- BE-F2-03 — Modelo de dados de recorrência (`recurring_templates`, SDD.md
-- Seção 5.2, entidade ausente nº 4) + geração mensal automática de lançamento
-- (RF-F2-02 AC1).
--
-- DIR-33 (auditoria de Edge Function antes de código novo): `supabase
-- functions list` não mostrou nenhuma function de recorrência pré-existente —
-- implementação nova, sem achado a registrar em `BLOCKERS.md`.
--
-- Escopo desta tarefa (TASK.md BE-F2-03): modelo de dados + geração mensal
-- (RF-F2-02 AC1). "Histórico de reajuste" (SDD.md Seção 5.2, valor prospectivo
-- a partir de competência escolhida) é RF-F2-03/BE-F2-04, ainda não
-- implementado — `amount_cents` aqui é só o "valor atual" citado pelo SDD,
-- sem tabela de histórico (evita antecipar uma modelagem que BE-F2-04 pode
-- precisar desenhar diferente). "Encerrar a partir de um mês" (RF-F2-02 AC2,
-- RN-07) é coberto por `end_date` — CRUD completo (criar/editar/encerrar) já
-- sai desta tarefa via RLS padrão, mesmo princípio de BE-M-01 (Budget não
-- teve uma tarefa de "CRUD" separada).
--
-- RN-07 (sem cascade delete entre RecurringTemplate e Transaction, DIR-05):
-- `transactions.recurring_rule_id` usa ON DELETE SET NULL (nunca CASCADE) —
-- excluir/encerrar um template não apaga o lançamento já gerado, só desfaz o
-- vínculo.
--
-- 100% aditiva (DIR-03): CREATE TABLE, CREATE FUNCTION, ALTER TABLE ADD
-- CONSTRAINT (FK nova sobre `transactions.recurring_rule_id`, coluna
-- antecipada desde a Fase 1, hoje inteiramente NULL). Nenhuma linha real de
-- public é alterada.
-- Rollback: supabase/migrations_down/20260903150000_be_f2_03_recurring_templates.down.sql

-- =============================================================================
-- 1. RecurringTemplate (RF-F2-02, SDD.md Seção 5.2)
-- =============================================================================

create table public.recurring_templates (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  description       text not null,
  amount_cents      bigint not null,
  category_id       uuid not null references public.categories(id),
  account_id        uuid not null references public.accounts(id),
  payment_method_id uuid not null references public.payment_methods(id),
  day_of_month      smallint not null,
  start_date        date not null,
  end_date          date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint recurring_templates_amount_positive check (amount_cents > 0),
  constraint recurring_templates_day_of_month_range check (day_of_month between 1 and 31),
  constraint recurring_templates_end_not_before_start check (end_date is null or end_date >= start_date)
);

comment on table public.recurring_templates is
  'RF-F2-02 — template de gasto recorrente (descrição, valor atual, categoria, '
  'forma de pagamento, dia do mês, início/fim). Criada por BE-F2-03 (SDD.md '
  'Seção 5.2, entidade ausente nº 4). "end_date" cobre RF-F2-02 AC2 (encerrar a '
  'partir de um mês) — RN-07 garante que isso nunca apaga lançamento já gerado.';

create trigger recurring_templates_set_updated_at
  before update on public.recurring_templates
  for each row execute function public.set_updated_at();

alter table public.recurring_templates enable row level security;

-- Mesmo padrão de credit_cards/budget (DIR-27 + gate MFA) e mesma extensão
-- transparente de BE-F2-01/BE-M-13: EXISTS de ownership em toda FK para tabela
-- "ownable" referenciada (category_id/account_id/payment_method_id), para não
-- reabrir a classe de IDOR corrigida em BE-M-13/Bloqueio 010.
create policy recurring_templates_select_own on public.recurring_templates
  for select to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

create policy recurring_templates_insert_own on public.recurring_templates
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and exists (select 1 from public.categories c where c.id = category_id and (c.user_id = auth.uid() or c.user_id is null))
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid())
    and exists (select 1 from public.payment_methods pm where pm.id = payment_method_id and pm.user_id = auth.uid())
  );

create policy recurring_templates_update_own on public.recurring_templates
  for update to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true')
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and exists (select 1 from public.categories c where c.id = category_id and (c.user_id = auth.uid() or c.user_id is null))
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid())
    and exists (select 1 from public.payment_methods pm where pm.id = payment_method_id and pm.user_id = auth.uid())
  );

create policy recurring_templates_delete_own on public.recurring_templates
  for delete to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

-- =============================================================================
-- 2. FK de transactions.recurring_rule_id -> recurring_templates.id (coluna
--    antecipada desde a Fase 1). ON DELETE SET NULL (nunca CASCADE, RN-07/
--    DIR-05) — excluir um template preserva o lançamento já gerado, só
--    desfaz o vínculo (usuário ainda pode excluir o lançamento manualmente
--    se quiser, CRUD normal de transactions, ação distinta de RN-07).
-- =============================================================================

alter table public.transactions
  add constraint transactions_recurring_rule_id_fkey
  foreign key (recurring_rule_id) references public.recurring_templates(id) on delete set null;

-- =============================================================================
-- 3. Geração mensal (RF-F2-02 AC1) — clamp de dia do mês (mesmo princípio de
--    credit_card_effective_closing_date, BE-F2-02, mas função própria: nome
--    por bounded context, DIR-09, sem acoplar Recorrência a Cartão).
-- =============================================================================

create function public.recurring_template_generation_date(p_month date, p_day_of_month smallint)
returns date
language sql
immutable
as $$
  select least(
    date_trunc('month', p_month)::date + (p_day_of_month - 1),
    (date_trunc('month', p_month) + interval '1 month - 1 day')::date
  );
$$;

comment on function public.recurring_template_generation_date(date, smallint) is
  'RF-F2-02 AC1 — data real de geração de um lançamento recorrente na '
  'competência de p_month, clampada ao último dia do mês (ex. day_of_month=31 '
  'num mês de 30 dias gera no dia 30).';

-- SECURITY DEFINER: itera template de todos os usuários (job global via
-- pg_cron), mesmo padrão de generate_upcoming_invoices/close_due_invoices
-- (BE-F2-02). Simplificação deliberada: só considera a competência de
-- current_date (não faz backfill retroativo de meses perdidos por falha de
-- agendamento — não é requisito desta tarefa); cada template é isolado num
-- bloco próprio de exceção para que 1 template com dado inconsistente (ex.
-- conta inativada depois da criação do template) não impeça a geração dos
-- demais no mesmo job.
create function public.generate_recurring_transactions()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_tpl     record;
  v_gen_date date;
  v_count   integer := 0;
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

      insert into public.transactions
        (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date, recurring_rule_id, description)
      values
        (v_tpl.user_id, v_tpl.account_id, v_tpl.payment_method_id, v_tpl.category_id, 'expense', v_tpl.amount_cents, v_gen_date, v_tpl.id, v_tpl.description);

      v_count := v_count + 1;
    exception when others then
      raise warning 'generate_recurring_transactions: falha ao gerar lançamento do template % (%): %', v_tpl.id, v_tpl.description, sqlerrm;
    end;
  end loop;

  return v_count;
end;
$$;

comment on function public.generate_recurring_transactions() is
  'RF-F2-02 AC1 — gera 1 lançamento por template ativo para a competência '
  'corrente, idempotente (não duplica se já gerado). SECURITY DEFINER: cobre '
  'template de todos os usuários. Retorna nº de lançamentos gerados nesta '
  'execução.';
