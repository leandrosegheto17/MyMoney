-- BE-M-14 — Correção primária/sistêmica de `SEC-DEBT-008` (`SECURITY-REVIEW.md`
-- Seção 1.12; `BLOCKERS.md` Bloqueio 015).
--
-- Achado do DevSecOps: nenhuma coluna `user_id` de nenhuma tabela "ownable" tem
-- `DEFAULT`/trigger que a preencha, e nenhum módulo de `frontend/src/lib/api/*.ts`
-- inclui `user_id` no payload de `.insert(input)`. RLS falha fechado (`WITH CHECK
-- (user_id = auth.uid())` rejeita `NULL`; tabelas com `user_id NOT NULL` rejeitam
-- antes disso, por `23502`), então o efeito não é vazamento cross-tenant, é quebra
-- total de disponibilidade da função de criar/editar em toda tabela "ownable" pelo
-- caminho real (browser → supabase-js → PostgREST → Postgres).
--
-- Confirmação por leitura direta do schema ao vivo (`supabase db dump --linked
-- --schema public`, projeto xrcxbzrglndetrrhavhc) antes desta migration: grep por
-- `DEFAULT auth.uid`/`SET DEFAULT` no dump não retorna nenhum resultado — achado
-- confirmado, não presumido a partir do relato do DevSecOps.
--
-- Escopo: as 12 tabelas listadas no Bloqueio 015 (accounts, categories,
-- payment_methods, budget, transactions, credit_cards, goals, contributions,
-- fixed_bills, recurring_templates, recurring_template_adjustments,
-- installment_purchases) MAIS `push_subscriptions`, que não estava na lista
-- original do Bloqueio 015 mas foi confirmada, durante esta verificação, como
-- afetada pelo mesmo padrão (`frontend/src/lib/api/notifications.ts`,
-- `createPushSubscription`, `.insert(input)` sem `user_id`, `NewPushSubscription`
-- não inclui a coluna) — desvio pequeno de escopo (mesma causa raiz, mesma
-- correção, sem ambiguidade), resolvido e documentado aqui e em `BLOCKERS.md`
-- Bloqueio 015 / `SECURITY-REVIEW.md` SEC-DEBT-008, não escalado ao Tech Lead.
-- `invoices`/`notifications` também têm `user_id NOT NULL`, mas não são inseridas
-- via `.insert()` do Frontend (geradas por Edge Function/trigger com
-- `service_role`/`SECURITY DEFINER`, fora do caminho afetado) — fora de escopo.
--
-- Correção: `ALTER COLUMN ... SET DEFAULT auth.uid()` — 100% aditivo (G-03/DIR-03),
-- não altera nenhuma linha existente, não remove NOT NULL/policy/trigger algum.
-- RLS/`NOT NULL` continuam sendo a defesa real; o `DEFAULT` só evita que a
-- ausência de `user_id` explícito no payload derrube a escrita quando o valor é
-- exatamente `auth.uid()` do próprio chamador — não enfraquece a checagem de
-- ownership em nenhuma policy (`WITH CHECK` continua comparando `user_id =
-- auth.uid()` normalmente; se o client enviar um `user_id` de outro usuário
-- explicitamente, o `DEFAULT` nem entra em jogo e a policy segue rejeitando).
--
-- Rollback: supabase/migrations_down/20260903260000_be_m14_user_id_default_auth_uid.down.sql

alter table public.accounts alter column user_id set default auth.uid();
alter table public.categories alter column user_id set default auth.uid();
alter table public.payment_methods alter column user_id set default auth.uid();
alter table public.budget alter column user_id set default auth.uid();
alter table public.transactions alter column user_id set default auth.uid();
alter table public.credit_cards alter column user_id set default auth.uid();
alter table public.goals alter column user_id set default auth.uid();
alter table public.contributions alter column user_id set default auth.uid();
alter table public.fixed_bills alter column user_id set default auth.uid();
alter table public.recurring_templates alter column user_id set default auth.uid();
alter table public.recurring_template_adjustments alter column user_id set default auth.uid();
alter table public.installment_purchases alter column user_id set default auth.uid();
alter table public.push_subscriptions alter column user_id set default auth.uid();

comment on column public.accounts.user_id is 'Owner (RLS). DEFAULT auth.uid() desde BE-M-14/Bloqueio 015/SEC-DEBT-008 — preenche mesmo quando o client não envia user_id explícito no INSERT.';
comment on column public.categories.user_id is 'Owner (RLS); NULL = categoria de sistema, compartilhada. DEFAULT auth.uid() desde BE-M-14/Bloqueio 015/SEC-DEBT-008 — só se aplica quando o client não envia user_id explícito; categorias de sistema continuam sendo criadas só via seed/migration, que envia user_id = NULL explicitamente.';
comment on column public.payment_methods.user_id is 'Owner (RLS). DEFAULT auth.uid() desde BE-M-14/Bloqueio 015/SEC-DEBT-008.';
comment on column public.budget.user_id is 'Owner (RLS). DEFAULT auth.uid() desde BE-M-14/Bloqueio 015/SEC-DEBT-008.';
comment on column public.transactions.user_id is 'Owner (RLS). DEFAULT auth.uid() desde BE-M-14/Bloqueio 015/SEC-DEBT-008.';
comment on column public.credit_cards.user_id is 'Owner (RLS). DEFAULT auth.uid() desde BE-M-14/Bloqueio 015/SEC-DEBT-008.';
comment on column public.goals.user_id is 'Owner (RLS). DEFAULT auth.uid() desde BE-M-14/Bloqueio 015/SEC-DEBT-008.';
comment on column public.contributions.user_id is 'Owner (RLS). DEFAULT auth.uid() desde BE-M-14/Bloqueio 015/SEC-DEBT-008.';
comment on column public.fixed_bills.user_id is 'Owner (RLS). DEFAULT auth.uid() desde BE-M-14/Bloqueio 015/SEC-DEBT-008.';
comment on column public.recurring_templates.user_id is 'Owner (RLS). DEFAULT auth.uid() desde BE-M-14/Bloqueio 015/SEC-DEBT-008.';
comment on column public.recurring_template_adjustments.user_id is 'Owner (RLS). DEFAULT auth.uid() desde BE-M-14/Bloqueio 015/SEC-DEBT-008.';
comment on column public.installment_purchases.user_id is 'Owner (RLS). DEFAULT auth.uid() desde BE-M-14/Bloqueio 015/SEC-DEBT-008.';
comment on column public.push_subscriptions.user_id is 'Owner (RLS). DEFAULT auth.uid() desde BE-M-14/Bloqueio 015/SEC-DEBT-008 — tabela adicionada ao escopo original do Bloqueio 015 durante a verificação desta correção (mesma causa raiz confirmada em createPushSubscription).';
