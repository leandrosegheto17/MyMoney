-- BE-M-01 — Migration aditiva de `Budget` (única entidade MVP ainda ausente em
-- `public`, SDD.md Seção 5.2) + reforço de RN-08/RN-09 a nível de banco sobre as
-- tabelas já existentes (achado de auditoria, AUDITORIA-BE-M-00.md Seção 2).
--
-- 100% aditiva (DIR-03/G-02/G-03): CREATE TABLE, CREATE FUNCTION, CREATE TRIGGER.
-- Nenhum ALTER/DROP sobre objeto existente. Nenhuma linha de dado real é tocada
-- (accounts/categories/transactions têm 0/12/0 linhas hoje — ver AUDITORIA Seção 1).
-- Rollback correspondente: supabase/migrations_down/20260902100000_be_m01_budget_and_rn08_rn09_guards.down.sql

-- =============================================================================
-- 1. Budget (RF-MVP-07, SDD.md Seção 5.2)
-- =============================================================================

create table public.budget (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  category_id         uuid not null references public.categories(id) on delete cascade,
  month               date not null,                 -- primeiro dia do mês de competência
  limit_cents         bigint not null,
  alert_threshold_pct smallint not null default 80,   -- RN-04: 80% padrão, configurável
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint budget_limit_positive check (limit_cents > 0),
  constraint budget_alert_threshold_range check (alert_threshold_pct between 1 and 100),
  constraint budget_month_is_first_of_month check (month = date_trunc('month', month)::date),
  constraint budget_user_category_month_unique unique (user_id, category_id, month)
);

comment on table public.budget is
  'RF-MVP-07 — teto de orçamento por categoria/mês. Criada por BE-M-01 (ADR-012, '
  'entidade ausente nº 1 do Plano de Evolução).';

create trigger budget_set_updated_at
  before update on public.budget
  for each row execute function public.set_updated_at();

alter table public.budget enable row level security;

create policy budget_select_own on public.budget
  for select to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

create policy budget_insert_own on public.budget
  for insert to authenticated
  with check (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

create policy budget_update_own on public.budget
  for update to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true')
  with check (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

create policy budget_delete_own on public.budget
  for delete to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

-- =============================================================================
-- 2. RN-08 — bloquear DELETE físico de `accounts` com lançamento vinculado
--    (achado: transactions_account_id_fkey / transactions_destination_account_id_fkey
--    são ON DELETE CASCADE hoje — sem este trigger, o DELETE apagaria o ledger em
--    silêncio em vez de ser bloqueado. AUDITORIA-BE-M-00.md Seção 2.)
-- =============================================================================

create function public.accounts_block_delete_when_linked()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.transactions
    where account_id = old.id or destination_account_id = old.id
  ) then
    raise exception 'account % has linked transactions and cannot be deleted; use inactivation instead (RN-08)', old.id
      using errcode = '23001'; -- restrict_violation -> PostgREST mapeia para 409 Conflict
  end if;
  return old;
end;
$$;

comment on function public.accounts_block_delete_when_linked() is
  'RN-08 (PRD-TECNICO.md) / DIR-05 / G-05 — impede DELETE físico de conta com '
  'lançamento vinculado; usuário deve inativar (accounts.is_active = false).';

create trigger accounts_before_delete_block_linked
  before delete on public.accounts
  for each row execute function public.accounts_block_delete_when_linked();

-- =============================================================================
-- 3. RN-09 — bloquear DELETE físico de `categories` com lançamento vinculado
-- =============================================================================

create function public.categories_block_delete_when_linked()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.transactions where category_id = old.id) then
    raise exception 'category % has linked transactions and cannot be deleted; reclassify them first (RN-09)', old.id
      using errcode = '23001';
  end if;
  if exists (select 1 from public.budget where category_id = old.id) then
    raise exception 'category % has budgets defined and cannot be deleted; remove the budgets first (RN-09, extensão RF-MVP-07)', old.id
      using errcode = '23001';
  end if;
  return old;
end;
$$;

comment on function public.categories_block_delete_when_linked() is
  'RN-09 (PRD-TECNICO.md) / DIR-05 / G-05 — impede DELETE físico de categoria com '
  'lançamento ou orçamento vinculado.';

create trigger categories_before_delete_block_linked
  before delete on public.categories
  for each row execute function public.categories_block_delete_when_linked();
