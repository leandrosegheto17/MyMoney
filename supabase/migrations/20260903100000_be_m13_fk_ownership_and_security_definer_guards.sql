-- BE-M-13 — Correção sistêmica de autorização de referência cruzada (IDOR) entre
-- tabelas "ownable" (`SECURITY-REVIEW.md` Seção 1.2, SEC-DEBT-002; `BLOCKERS.md`
-- Bloqueio 010; `CTO-REVIEW.md` "Revisão de Segurança do Lote MVP", item 2).
--
-- Achado do DevSecOps: `budget_insert_own`/`budget_update_own` e
-- `transactions_insert_own`/`transactions_update_own` verificam só
-- `auth.uid() = user_id` da própria linha, sem validar que as colunas de FK para
-- outra tabela "ownable" (`budget.category_id`; `transactions.account_id`/
-- `category_id`/`payment_method_id`/`destination_account_id`) pertencem ao mesmo
-- usuário. Adicionalmente, `categories_block_delete_when_linked`/
-- `accounts_block_delete_when_linked` (triggers de RN-08/RN-09, BE-M-01) não são
-- `SECURITY DEFINER`, então a checagem de bloqueio de DELETE roda sob a RLS de
-- quem executa a ação e não enxerga linha de outro usuário que deveria bloquear
-- a exclusão.
--
-- Correção (a): DROP + CREATE das 4 policies afetadas, acrescentando `EXISTS (...)`
-- de ownership da FK referenciada (mesmo precedente já usado em BE-M-02 para
-- reforçar payment_methods_update_own/_delete_own — DROP+CREATE de policy não é
-- "ALTER/DROP destrutivo sobre objeto com dado real" no sentido de DIR-03, é
-- redefinição de regra de acesso, não perda de dado).
-- Correção (b): CREATE OR REPLACE das 2 funções de trigger com
-- `SECURITY DEFINER SET search_path TO 'public', 'pg_temp'` — mesmo padrão já
-- usado em `auth_users_restrict_signup` (BE-M-12) e `custom_access_token_hook`.
--
-- 100% aditivo em termos de dado (nenhum INSERT/UPDATE/DELETE de linha real,
-- DIR-03) — só redefinição de policy/function. Nenhuma tabela nova, nenhuma
-- coluna nova.
-- Rollback: supabase/migrations_down/20260903100000_be_m13_fk_ownership_and_security_definer_guards.down.sql

-- =============================================================================
-- 1. budget — ownership de `category_id` em INSERT/UPDATE
-- =============================================================================

drop policy if exists budget_insert_own on public.budget;
create policy budget_insert_own on public.budget
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and exists (
      select 1 from public.categories c
      where c.id = category_id
        and (c.user_id = auth.uid() or c.user_id is null) -- null = categoria de sistema, compartilhada por design
    )
  );

drop policy if exists budget_update_own on public.budget;
create policy budget_update_own on public.budget
  for update to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true')
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and exists (
      select 1 from public.categories c
      where c.id = category_id
        and (c.user_id = auth.uid() or c.user_id is null)
    )
  );

-- =============================================================================
-- 2. transactions — ownership de account_id/category_id/payment_method_id/
--    destination_account_id em INSERT/UPDATE.
--    category_id/payment_method_id/destination_account_id são nullable
--    (transfer não usa payment_method_id/category_id; income/expense não usa
--    destination_account_id) — checagem só se aplica quando a coluna não é null.
--    accounts/payment_methods não têm registro de sistema (user_id sempre
--    not null nas duas tabelas), diferente de categories.
-- =============================================================================

drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own on public.transactions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid())
    and (category_id is null or exists (
      select 1 from public.categories c
      where c.id = category_id and (c.user_id = auth.uid() or c.user_id is null)
    ))
    and (payment_method_id is null or exists (
      select 1 from public.payment_methods pm
      where pm.id = payment_method_id and pm.user_id = auth.uid()
    ))
    and (destination_account_id is null or exists (
      select 1 from public.accounts da
      where da.id = destination_account_id and da.user_id = auth.uid()
    ))
  );

drop policy if exists transactions_update_own on public.transactions;
create policy transactions_update_own on public.transactions
  for update to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true')
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid())
    and (category_id is null or exists (
      select 1 from public.categories c
      where c.id = category_id and (c.user_id = auth.uid() or c.user_id is null)
    ))
    and (payment_method_id is null or exists (
      select 1 from public.payment_methods pm
      where pm.id = payment_method_id and pm.user_id = auth.uid()
    ))
    and (destination_account_id is null or exists (
      select 1 from public.accounts da
      where da.id = destination_account_id and da.user_id = auth.uid()
    ))
  );

-- =============================================================================
-- 3. RN-08/RN-09 — promover os triggers de bloqueio de DELETE a SECURITY DEFINER
--    com search_path fixo (mesmo padrão de auth_users_restrict_signup, BE-M-12),
--    para que a checagem de vínculo enxergue linha de QUALQUER usuário,
--    independente de quem está executando o DELETE.
-- =============================================================================

create or replace function public.accounts_block_delete_when_linked()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
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
  'lançamento vinculado; usuário deve inativar (accounts.is_active = false). '
  'SECURITY DEFINER (BE-M-13/Bloqueio 010, G-19) — checagem precisa enxergar '
  'lançamento de QUALQUER usuário vinculado à conta sendo excluída, não só o do '
  'executor do DELETE (RLS de quem executa não veria linha de outro dono).';

create or replace function public.categories_block_delete_when_linked()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
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
  'lançamento ou orçamento vinculado. SECURITY DEFINER (BE-M-13/Bloqueio 010, '
  'G-19) — categoria de sistema (user_id IS NULL) e categoria referenciada por '
  'budget/transaction de OUTRO usuário (permitido por design, categorias de '
  'sistema são compartilhadas) precisam ser enxergadas pela checagem '
  'independente de quem executa o DELETE.';
