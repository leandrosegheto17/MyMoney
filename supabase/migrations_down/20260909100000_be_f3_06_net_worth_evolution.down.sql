-- Rollback manual de 20260909100000_be_f3_06_net_worth_evolution.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>

drop function if exists public.get_net_worth_evolution(uuid);
