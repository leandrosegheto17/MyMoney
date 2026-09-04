-- Rollback manual de 20260903150000_be_f2_03_recurring_templates.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>
-- ATENÇÃO: reverte a geração automática de lançamento recorrente (RF-F2-02
-- AC1). Também recomendado: `select cron.unschedule('be-f2-03-recurring-
-- generate');` e remover a Edge Function `recurring-generate` — não incluído
-- aqui por operar fora do escopo de uma migration SQL.

drop function if exists public.generate_recurring_transactions();
drop function if exists public.recurring_template_generation_date(date, smallint);

alter table public.transactions
  drop constraint if exists transactions_recurring_rule_id_fkey;

drop policy if exists recurring_templates_delete_own on public.recurring_templates;
drop policy if exists recurring_templates_update_own on public.recurring_templates;
drop policy if exists recurring_templates_insert_own on public.recurring_templates;
drop policy if exists recurring_templates_select_own on public.recurring_templates;

drop trigger if exists recurring_templates_set_updated_at on public.recurring_templates;

drop table if exists public.recurring_templates;
