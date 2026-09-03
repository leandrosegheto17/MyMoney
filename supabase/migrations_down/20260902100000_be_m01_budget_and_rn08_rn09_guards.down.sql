-- Rollback manual de 20260902100000_be_m01_budget_and_rn08_rn09_guards.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>
-- Seguro mesmo que `budget` já tenha dado real, contanto que a decisão de remover
-- esse dado tenha sido tomada conscientemente (G-02) — este script assume que sim.

drop trigger if exists categories_before_delete_block_linked on public.categories;
drop function if exists public.categories_block_delete_when_linked();

drop trigger if exists accounts_before_delete_block_linked on public.accounts;
drop function if exists public.accounts_block_delete_when_linked();

drop policy if exists budget_delete_own on public.budget;
drop policy if exists budget_update_own on public.budget;
drop policy if exists budget_insert_own on public.budget;
drop policy if exists budget_select_own on public.budget;

drop trigger if exists budget_set_updated_at on public.budget;

drop table if exists public.budget;
