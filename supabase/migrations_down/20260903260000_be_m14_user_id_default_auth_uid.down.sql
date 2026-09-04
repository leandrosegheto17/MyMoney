-- Rollback manual de 20260903260000_be_m14_user_id_default_auth_uid.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>
-- ATENÇÃO: reverte a correção primária de SEC-DEBT-008/Bloqueio 015 — reintroduz a
-- quebra de disponibilidade de INSERT via Frontend em toda tabela "ownable" (RLS/
-- NOT NULL voltam a rejeitar user_id ausente). Só aplicar com ciência explícita do
-- risco (mesmo padrão de decisão consciente já usado nos demais rollbacks, G-02) —
-- e nunca sem a defesa em profundidade complementar (Frontend, `withOwnerId`) já
-- aplicada em produção, sob pena de derrubar a escrita do produto novamente.

alter table public.accounts alter column user_id drop default;
alter table public.categories alter column user_id drop default;
alter table public.payment_methods alter column user_id drop default;
alter table public.budget alter column user_id drop default;
alter table public.transactions alter column user_id drop default;
alter table public.credit_cards alter column user_id drop default;
alter table public.goals alter column user_id drop default;
alter table public.contributions alter column user_id drop default;
alter table public.fixed_bills alter column user_id drop default;
alter table public.recurring_templates alter column user_id drop default;
alter table public.recurring_template_adjustments alter column user_id drop default;
alter table public.installment_purchases alter column user_id drop default;
alter table public.push_subscriptions alter column user_id drop default;

comment on column public.accounts.user_id is 'Owner (RLS).';
comment on column public.categories.user_id is 'Owner (RLS); NULL = categoria de sistema, compartilhada.';
comment on column public.payment_methods.user_id is 'Owner (RLS).';
comment on column public.budget.user_id is 'Owner (RLS).';
comment on column public.transactions.user_id is 'Owner (RLS).';
comment on column public.credit_cards.user_id is 'Owner (RLS).';
comment on column public.goals.user_id is 'Owner (RLS).';
comment on column public.contributions.user_id is 'Owner (RLS).';
comment on column public.fixed_bills.user_id is 'Owner (RLS).';
comment on column public.recurring_templates.user_id is 'Owner (RLS).';
comment on column public.recurring_template_adjustments.user_id is 'Owner (RLS).';
comment on column public.installment_purchases.user_id is 'Owner (RLS).';
comment on column public.push_subscriptions.user_id is 'Owner (RLS).';
