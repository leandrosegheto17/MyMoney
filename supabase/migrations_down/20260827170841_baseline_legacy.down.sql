-- Rollback manual de 20260827170841_baseline_legacy.sql (conteúdo populado por
-- BLOCKERS.md Bloqueio 011, 2026-09-03 — ver comentário completo no arquivo "up").
--
-- ATENÇÃO: este script é destrutivo por natureza (DROP de todo o schema do
-- produto) — mesma categoria de risco já aceita para os demais rollbacks desta
-- pasta (G-02/DIR-04). Só faz sentido aplicar contra um projeto NOVO/de teste
-- usado para validar o fluxo `db push` de um DR drill — NUNCA contra o projeto
-- linkado real (xrcxbzrglndetrrhavhc), que tem dado de produção e onde esta
-- migration nunca é reexecutada de qualquer forma (já registrada como aplicada).
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>
--
-- Extensões (pg_cron/pg_net/pg_stat_statements/pgcrypto/supabase_vault/uuid-ossp)
-- NÃO são removidas — instalar/remover extensão é operação de escopo de projeto,
-- fora do que este rollback deveria decidir sozinho (podem ser usadas por outros
-- objetos fora deste dump).

drop table if exists public.transactions cascade;
drop table if exists public.accounts cascade;
drop table if exists public.allowed_signup_emails cascade;
drop table if exists public.backup_export_log cascade;
drop table if exists public.budget cascade;
drop table if exists public.categories cascade;
drop table if exists public.email_mfa_challenges cascade;
drop table if exists public.payment_methods cascade;
drop table if exists public.profiles cascade;
drop table if exists public.webauthn_challenges cascade;
drop table if exists public.webauthn_credentials cascade;

drop function if exists public.accounts_adjust_balance_on_initial_update() cascade;
drop function if exists public.accounts_block_delete_when_linked() cascade;
drop function if exists public.accounts_init_current_balance() cascade;
drop function if exists public.accounts_seed_default_payment_methods() cascade;
drop function if exists public.apply_transaction_effect(public.transactions, smallint) cascade;
drop function if exists public.auth_users_restrict_signup() cascade;
drop function if exists public.categories_block_delete_when_linked() cascade;
drop function if exists public.check_backup_health() cascade;
drop function if exists public.custom_access_token_hook(jsonb) cascade;
drop function if exists public.fn_clear_due_transactions() cascade;
drop function if exists public.get_budget_status(uuid) cascade;
drop function if exists public.get_month_provision() cascade;
drop function if exists public.get_month_transaction_count() cascade;
drop function if exists public.get_monthly_category_summary() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_pin(text) cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.transactions_block_inactive_account() cascade;
drop function if exists public.transactions_maintain_account_balance() cascade;
drop function if exists public.transactions_set_status() cascade;
drop function if exists public.trigger_backup_export() cascade;
drop function if exists public.validate_category_hierarchy() cascade;
drop function if exists public.verify_pin(text) cascade;

drop type if exists public.account_type cascade;
drop type if exists public.category_kind cascade;
drop type if exists public.payment_method_type cascade;
drop type if exists public.transaction_kind cascade;
drop type if exists public.transaction_source cascade;
drop type if exists public.transaction_status cascade;

-- Nota: get_budget_status/get_month_provision/get_month_transaction_count/
-- get_monthly_category_summary podem ter assinatura diferente da acima (sem
-- argumento posicional nomeado exigido pelo DROP) — se o `DROP FUNCTION`
-- correspondente falhar por assinatura, use
-- `DROP FUNCTION IF EXISTS public.<nome> CASCADE` sem parênteses de tipo
-- (Postgres aceita se o nome for não-ambíguo) como alternativa manual.
