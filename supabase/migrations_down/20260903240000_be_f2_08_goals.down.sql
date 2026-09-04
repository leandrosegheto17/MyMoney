-- Rollback manual de 20260903240000_be_f2_08_goals.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>
-- ATENÇÃO: reverte o modelo de metas/aportes (RF-F2-08) por completo.

drop function if exists public.get_goals_progress();

drop policy if exists contributions_delete_own on public.contributions;
drop policy if exists contributions_update_own on public.contributions;
drop policy if exists contributions_insert_own on public.contributions;
drop policy if exists contributions_select_own on public.contributions;

drop table if exists public.contributions;

drop policy if exists goals_delete_own on public.goals;
drop policy if exists goals_update_own on public.goals;
drop policy if exists goals_insert_own on public.goals;
drop policy if exists goals_select_own on public.goals;

drop trigger if exists goals_set_updated_at on public.goals;

drop table if exists public.goals;
