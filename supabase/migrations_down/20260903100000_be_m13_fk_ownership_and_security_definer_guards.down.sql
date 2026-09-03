-- Rollback manual de 20260903100000_be_m13_fk_ownership_and_security_definer_guards.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>
-- ATENÇÃO: reverte a correção de IDOR (Bloqueio 010/SEC-DEBT-002) — reintroduz o
-- gap de autorização de referência cruzada. Só aplicar com ciência explícita do
-- risco (mesmo padrão de decisão consciente já usado nos demais rollbacks, G-02).

-- Restaura as 2 funções de trigger ao estado pré-BE-M-13 (sem SECURITY DEFINER).

create or replace function public.accounts_block_delete_when_linked()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.transactions
    where account_id = old.id or destination_account_id = old.id
  ) then
    raise exception 'account % has linked transactions and cannot be deleted; use inactivation instead (RN-08)', old.id
      using errcode = '23001';
  end if;
  return old;
end;
$$;

comment on function public.accounts_block_delete_when_linked() is
  'RN-08 (PRD-TECNICO.md) / DIR-05 / G-05 — impede DELETE físico de conta com '
  'lançamento vinculado; usuário deve inativar (accounts.is_active = false).';

create or replace function public.categories_block_delete_when_linked()
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

-- Restaura as 4 policies ao estado pré-BE-M-13 (sem EXISTS de ownership de FK).

drop policy if exists transactions_update_own on public.transactions;
create policy transactions_update_own on public.transactions
  for update to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true')
  with check (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own on public.transactions
  for insert to authenticated
  with check (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

drop policy if exists budget_update_own on public.budget;
create policy budget_update_own on public.budget
  for update to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true')
  with check (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

drop policy if exists budget_insert_own on public.budget;
create policy budget_insert_own on public.budget
  for insert to authenticated
  with check (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');
