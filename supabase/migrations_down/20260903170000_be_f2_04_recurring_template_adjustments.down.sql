-- Rollback manual de 20260903170000_be_f2_04_recurring_template_adjustments.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>
-- ATENÇÃO: restaura generate_recurring_transactions ao estado pré-BE-F2-04
-- (lê amount_cents direto, sem histórico de reajuste) e volta a permitir
-- UPDATE direto de amount_cents em recurring_templates. Só aplicar com
-- ciência explícita do risco (mesmo padrão dos demais rollbacks, G-02).

create or replace function public.generate_recurring_transactions()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_tpl      record;
  v_gen_date date;
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

drop function if exists public.recurring_template_amount_for(uuid, date);

drop trigger if exists recurring_templates_before_update_reject_amount_change on public.recurring_templates;
drop function if exists public.recurring_templates_reject_direct_amount_change();

drop trigger if exists recurring_template_adjustments_before_update_prospective on public.recurring_template_adjustments;
drop trigger if exists recurring_template_adjustments_before_insert_prospective on public.recurring_template_adjustments;
drop function if exists public.recurring_template_adjustments_enforce_prospective();

drop policy if exists recurring_template_adjustments_delete_own on public.recurring_template_adjustments;
drop policy if exists recurring_template_adjustments_update_own on public.recurring_template_adjustments;
drop policy if exists recurring_template_adjustments_insert_own on public.recurring_template_adjustments;
drop policy if exists recurring_template_adjustments_select_own on public.recurring_template_adjustments;

drop table if exists public.recurring_template_adjustments;
