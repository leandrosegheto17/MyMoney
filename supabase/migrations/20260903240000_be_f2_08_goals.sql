-- BE-F2-08 — Modelo de dados de metas (`goals`, `contributions` — SDD.md
-- Seção 5.2, entidades ausentes nº 7 "Goal"/nº 8 "Contribution") + cálculo
-- de percentual de progresso (RF-F2-08 AC1-2).
--
-- Sem Edge Function nova (mesma categoria de BE-F2-04/BE-M-08): só
-- modelagem + RLS + 1 RPC de leitura agregada — DIR-33 não se aplica.
--
-- Desenho: SDD.md Seção 5.2 não lista coluna antecipatória em `transactions`
-- para Contribution (diferente de RecurringTemplate/InstallmentPurchase/
-- Invoice/FixedBill) — aporte de meta é registrado como entidade PRÓPRIA,
-- não como um Transaction (UX-FL-15/S-GOAL-03 "registrar aporte" também não
-- referencia lançamento nenhum). Decisão física do Backend (SDD.md é
-- "modelo lógico, não modelagem física"): progresso é sempre CALCULADO ao
-- vivo por soma de contributions.amount_cents (nunca armazenado numa coluna
-- denormalizada) — "recalculado a cada aporte vinculado" (critério de
-- aceite literal) é satisfeito por construção: não há cache pra ficar
-- desatualizado, mesma filosofia de get_budget_status (BE-M-08),
-- get_month_provision (legado).
--
-- 100% aditiva (DIR-03): CREATE TABLE x2, CREATE FUNCTION. Nenhuma linha
-- real de public é alterada.
-- Rollback: supabase/migrations_down/20260903240000_be_f2_08_goals.down.sql

-- =============================================================================
-- 1. Goal (RF-F2-08, SDD.md Seção 5.2)
-- =============================================================================

create table public.goals (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  name                 text not null,
  target_amount_cents  bigint not null,
  target_date          date,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint goals_target_amount_positive check (target_amount_cents > 0)
);

comment on table public.goals is
  'RF-F2-08 — meta de economia (nome, valor-alvo, prazo opcional). Criada '
  'por BE-F2-08 (SDD.md Seção 5.2, entidade ausente nº 7). "is_active" '
  'permite pausar/arquivar sem excluir (decisão física do Backend — AC2 '
  '"progresso de cada meta ATIVA" pressupõe o conceito, não modelado no '
  'SDD.md lógico).';

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

alter table public.goals enable row level security;

create policy goals_select_own on public.goals
  for select to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

create policy goals_insert_own on public.goals
  for insert to authenticated
  with check (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

create policy goals_update_own on public.goals
  for update to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true')
  with check (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

create policy goals_delete_own on public.goals
  for delete to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

-- =============================================================================
-- 2. Contribution (aporte de meta) — RF-F2-08 AC1. FK para outra tabela
--    "ownable" (goals) -> EXISTS de ownership no INSERT/UPDATE desde a
--    criação (G-19/GUARDRAILS.md, mesma extensão IDOR-safe já aplicada a
--    toda tabela nova de Fase 2 — BE-F2-01/02/03/04/05/06).
-- =============================================================================

create table public.contributions (
  id                uuid primary key default gen_random_uuid(),
  goal_id           uuid not null references public.goals(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  amount_cents      bigint not null,
  contribution_date date not null default current_date,
  created_at        timestamptz not null default now(),
  constraint contributions_amount_positive check (amount_cents > 0)
);

comment on table public.contributions is
  'RF-F2-08 AC1 — aporte vinculado a uma Goal (valor, data). Criada por '
  'BE-F2-08 (SDD.md Seção 5.2, entidade ausente nº 8). Não é um Transaction '
  '(sem coluna antecipatória em transactions para esta entidade, diferente '
  'de RecurringTemplate/InstallmentPurchase/Invoice/FixedBill) — decisão '
  'física do Backend, alinhada a UX-FL-15/S-GOAL-03, que trata "registrar '
  'aporte" como ação própria, não como lançamento no ledger. ON DELETE '
  'CASCADE em goal_id (diferente de RN-07/transactions.*_id, que usam SET '
  'NULL): aporte não tem sentido órfão de meta excluída — não é um Transaction '
  'do ledger, não há regra de preservação histórica equivalente aqui.';

alter table public.contributions enable row level security;

create policy contributions_select_own on public.contributions
  for select to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

create policy contributions_insert_own on public.contributions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())
  );

create policy contributions_update_own on public.contributions
  for update to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true')
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())
  );

create policy contributions_delete_own on public.contributions
  for delete to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

-- =============================================================================
-- 3. Progresso (RF-F2-08 AC1-2) — DIR-06 "uma função só", sempre calculada
--    ao vivo (nenhum estado denormalizado a ficar desatualizado).
-- =============================================================================

create function public.get_goals_progress()
returns table (
  goal_id               uuid,
  name                  text,
  target_amount_cents   bigint,
  target_date           date,
  is_active             boolean,
  current_amount_cents  bigint,
  pct_progress          numeric
)
language sql
stable
set search_path to 'public'
as $$
  select
    g.id as goal_id,
    g.name,
    g.target_amount_cents,
    g.target_date,
    g.is_active,
    coalesce(c.total_cents, 0)::bigint as current_amount_cents,
    round((coalesce(c.total_cents, 0)::numeric / nullif(g.target_amount_cents, 0)::numeric) * 100, 2) as pct_progress
  from public.goals g
  left join (
    select goal_id, sum(amount_cents) as total_cents
    from public.contributions
    where user_id = auth.uid()
    group by goal_id
  ) c on c.goal_id = g.id
  where g.user_id = auth.uid();
$$;

comment on function public.get_goals_progress() is
  'RF-F2-08 AC1-2 — progresso (valor atual + percentual) de cada Goal do '
  'usuário, somando contributions ao vivo — nunca uma coluna cacheada, '
  '"recalculado a cada aporte vinculado" por construção (não há cache pra '
  'ficar desatualizado, seja inserindo, editando ou removendo um aporte). '
  'pct_progress pode passar de 100 quando a meta é superada (sem clamp — o '
  'valor real é mais informativo que truncar em 100). SECURITY INVOKER '
  '(padrão): respeita a RLS normal de goals/contributions.';
