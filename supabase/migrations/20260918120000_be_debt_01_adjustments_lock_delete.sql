-- BE-DEBT-01 — SEC-DEBT-013 (SECURITY-REVIEW.md Seção 1.27): o dono podia dar
-- DELETE em recurring_template_adjustments (policy delete_own) apagando a
-- trilha de reajuste já vigente/consumido. Mesmo padrão de
-- installment_purchases_lock_after_first_generation (BE-F2-05).
--
-- Rejeita DELETE quando effective_from <= competência corrente OU já existe
-- lançamento gerado pelo template em competência >= effective_from.
-- Permite: reajuste futuro ainda não vigente/consumido; e exclusões em
-- cascata (template ou usuário já removido) e por rotinas sem sessão de
-- usuário (auth.uid() nulo, ex.: delete_user_data via service_role).
-- Rollback: supabase/migrations_down/20260918120000_be_debt_01_adjustments_lock_delete.down.sql

create function public.recurring_template_adjustments_lock_delete_when_effective()
returns trigger
language plpgsql
as $$
begin
  -- Sem sessão de usuário final (service_role/owner): rotinas de manutenção.
  if auth.uid() is null then
    return old;
  end if;

  -- Exclusão em cascata: template pai ou usuário já removidos nesta operação.
  if not exists (select 1 from public.recurring_templates rt where rt.id = old.recurring_template_id)
     or not exists (select 1 from auth.users u where u.id = old.user_id)
  then
    return old;
  end if;

  if old.effective_from <= date_trunc('month', current_date)::date
     or exists (
       select 1 from public.transactions t
       where t.recurring_rule_id = old.recurring_template_id
         and t.transaction_date >= old.effective_from
     )
  then
    raise exception 'reajuste já vigente ou consumido por geração não pode ser excluído (RN-02, trilha de auditoria)'
      using errcode = '23514';
  end if;

  return old;
end;
$$;

comment on function public.recurring_template_adjustments_lock_delete_when_effective() is
  'BE-DEBT-01/SEC-DEBT-013 — bloqueia DELETE de reajuste vigente/consumido; '
  'só reajuste futuro ainda não consumido pode ser excluído pelo dono.';

create trigger recurring_template_adjustments_before_delete_lock
  before delete on public.recurring_template_adjustments
  for each row execute function public.recurring_template_adjustments_lock_delete_when_effective();
