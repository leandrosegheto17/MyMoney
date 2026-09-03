-- schema-baseline-legacy.sql — dump schema-only REAL do projeto Supabase linkado
-- (xrcxbzrglndetrrhavhc), gerado via `supabase db dump --linked -f
-- supabase/schema-baseline-legacy.sql`. Corrigido em 2026-09-03 (BLOCKERS.md
-- Bloqueio 011 / SECURITY-REVIEW.md Seção 1.3) — antes desta correção, este
-- arquivo era um placeholder e NÃO estava referenciado em nenhuma migration nem
-- em `config.toml`, o que significava que um ambiente novo não recriaria o
-- schema. Duas mudanças fecham o gap:
--   (1) este mesmo conteúdo agora vive também em
--       `supabase/migrations/20260827170841_baseline_legacy.sql` (posição
--       cronológica mais antiga) — É esse arquivo, não este, que o `supabase db
--       push` contra um projeto novo de fato aplica;
--   (2) este arquivo passa a ser referenciado em `supabase/config.toml`
--       (`db.migrations.schema_paths`), para o workflow de schema declarativo
--       (`supabase db diff`).
-- Regenerar após qualquer migration nova que altere schema:
--   supabase db dump --linked -f supabase/schema-baseline-legacy.sql
-- (mantém este arquivo como still-accurate; NÃO precisa reduplicar em nenhuma
-- migration nova — migrations novas já têm DDL real próprio, este arquivo só
-- cobre o legado + serve de referência de "estado atual completo").




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."account_type" AS ENUM (
    'checking',
    'savings',
    'wallet',
    'investment'
);


ALTER TYPE "public"."account_type" OWNER TO "postgres";


CREATE TYPE "public"."category_kind" AS ENUM (
    'income',
    'expense'
);


ALTER TYPE "public"."category_kind" OWNER TO "postgres";


CREATE TYPE "public"."payment_method_type" AS ENUM (
    'pix',
    'debit_card',
    'credit_card',
    'boleto',
    'cash'
);


ALTER TYPE "public"."payment_method_type" OWNER TO "postgres";


CREATE TYPE "public"."transaction_kind" AS ENUM (
    'income',
    'expense',
    'transfer'
);


ALTER TYPE "public"."transaction_kind" OWNER TO "postgres";


CREATE TYPE "public"."transaction_source" AS ENUM (
    'manual',
    'audio',
    'ocr',
    'import',
    'openfinance'
);


ALTER TYPE "public"."transaction_source" OWNER TO "postgres";


CREATE TYPE "public"."transaction_status" AS ENUM (
    'pending',
    'cleared',
    'reconciled'
);


ALTER TYPE "public"."transaction_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accounts_adjust_balance_on_initial_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.current_balance_cents := old.current_balance_cents
    + (new.initial_balance_cents - old.initial_balance_cents);
  return new;
end;
$$;


ALTER FUNCTION "public"."accounts_adjust_balance_on_initial_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accounts_block_delete_when_linked"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if exists (
    select 1 from public.transactions
    where account_id = old.id or destination_account_id = old.id
  ) then
    raise exception 'account % has linked transactions and cannot be deleted; use inactivation instead (RN-08)', old.id
      using errcode = '23001'; -- restrict_violation -> PostgREST mapeia para 409 Conflict
  end if;
  return old;
end;
$$;


ALTER FUNCTION "public"."accounts_block_delete_when_linked"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."accounts_block_delete_when_linked"() IS 'RN-08 (PRD-TECNICO.md) / DIR-05 / G-05 — impede DELETE físico de conta com lançamento vinculado; usuário deve inativar (accounts.is_active = false). SECURITY DEFINER (BE-M-13/Bloqueio 010, G-19) — checagem precisa enxergar lançamento de QUALQUER usuário vinculado à conta sendo excluída, não só o do executor do DELETE (RLS de quem executa não veria linha de outro dono).';



CREATE OR REPLACE FUNCTION "public"."accounts_init_current_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.current_balance_cents := new.initial_balance_cents;
  return new;
end;
$$;


ALTER FUNCTION "public"."accounts_init_current_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accounts_seed_default_payment_methods"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if not exists (
    select 1 from public.payment_methods
    where user_id = new.user_id and is_system_default = true
  ) then
    insert into public.payment_methods (user_id, account_id, type, name, is_system_default)
    values
      (new.user_id, new.id, 'pix',        'Pix',      true),
      (new.user_id, new.id, 'debit_card', 'Débito',   true),
      (new.user_id, new.id, 'boleto',     'Boleto',   true),
      (new.user_id, new.id, 'cash',       'Dinheiro', true);
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."accounts_seed_default_payment_methods"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."accounts_seed_default_payment_methods"() IS 'RF-MVP-02 AC1 — semeia as 4 formas de pagamento padrão (não-cartão) na primeira conta ativa de cada usuário. "Crédito" fica fora (ver BE-F2-01).';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "destination_account_id" "uuid",
    "payment_method_id" "uuid",
    "category_id" "uuid",
    "kind" "public"."transaction_kind" NOT NULL,
    "amount_cents" bigint NOT NULL,
    "description" "text",
    "transaction_date" "date" NOT NULL,
    "status" "public"."transaction_status" NOT NULL,
    "recurring_rule_id" "uuid",
    "installment_plan_id" "uuid",
    "installment_number" smallint,
    "card_invoice_id" "uuid",
    "attachment_id" "uuid",
    "source" "public"."transaction_source" DEFAULT 'manual'::"public"."transaction_source" NOT NULL,
    "import_staging_id" "uuid",
    "external_ref" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "transactions_amount_positive" CHECK (("amount_cents" > 0)),
    CONSTRAINT "transactions_non_transfer_requires_method_and_category" CHECK ((("kind" = 'transfer'::"public"."transaction_kind") OR (("payment_method_id" IS NOT NULL) AND ("category_id" IS NOT NULL)))),
    CONSTRAINT "transactions_transfer_destination_check" CHECK ((("kind" <> 'transfer'::"public"."transaction_kind") OR (("destination_account_id" IS NOT NULL) AND ("destination_account_id" <> "account_id"))))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."transactions" IS 'Transações financeiras do usuário (SDD.md §2.8), tabela central do domínio. kind=transfer não usa payment_method_id/category_id (dedução direta do texto do SDD) e exige destination_account_id != account_id. status é sempre recalculado por trigger no INSERT (transactions_set_status), nunca aceito do client.';



COMMENT ON COLUMN "public"."transactions"."destination_account_id" IS 'Conta de destino, obrigatória quando kind=transfer (ver transactions_transfer_destination_check). NULL para income/expense.';



COMMENT ON COLUMN "public"."transactions"."payment_method_id" IS 'Nullable quando kind=transfer (transferência não usa meio de pagamento). Obrigatório para income/expense (ver transactions_non_transfer_requires_method_and_category).';



COMMENT ON COLUMN "public"."transactions"."category_id" IS 'Nullable quando kind=transfer. Obrigatório para income/expense (ver transactions_non_transfer_requires_method_and_category).';



COMMENT ON COLUMN "public"."transactions"."status" IS 'Calculado por trigger (transactions_set_status) a partir de transaction_date vs. hoje em America/Sao_Paulo, ignorando qualquer valor enviado pelo client no INSERT. Promoção pending -> cleared ao longo do tempo é responsabilidade de um cron separado (F1-BE-09), fora do escopo desta migration.';



COMMENT ON COLUMN "public"."transactions"."recurring_rule_id" IS 'SEM FK: tabela recurring_rules só existe na Fase 2. Coluna nullable já criada aqui por decisão do SDD.md §2.8.';



COMMENT ON COLUMN "public"."transactions"."installment_plan_id" IS 'SEM FK: tabela installment_plans só existe na Fase 2. Coluna nullable já criada aqui por decisão do SDD.md §2.8.';



COMMENT ON COLUMN "public"."transactions"."card_invoice_id" IS 'SEM FK: tabela card_invoices só existe na Fase 2. Coluna nullable já criada aqui por decisão do SDD.md §2.8.';



COMMENT ON COLUMN "public"."transactions"."attachment_id" IS 'SEM FK: tabela attachments só existe na Fase 4. Coluna nullable já criada aqui por decisão do SDD.md §2.8.';



COMMENT ON COLUMN "public"."transactions"."import_staging_id" IS 'SEM FK: tabela import_staging_transactions só existe na Fase 4. Coluna nullable já criada aqui por decisão do SDD.md §2.8.';



COMMENT ON COLUMN "public"."transactions"."external_ref" IS 'Id da transação no Open Finance, usado para idempotência de sync futuro. UNIQUE(user_id, external_ref) — NULLs não conflitam entre si no Postgres, então não impede múltiplas transações manuais sem external_ref.';



CREATE OR REPLACE FUNCTION "public"."apply_transaction_effect"("p_row" "public"."transactions", "p_sign" smallint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  if p_row.kind = 'income' then
    update public.accounts
      set current_balance_cents = current_balance_cents + p_sign * p_row.amount_cents
      where id = p_row.account_id;
  elsif p_row.kind = 'expense' then
    update public.accounts
      set current_balance_cents = current_balance_cents - p_sign * p_row.amount_cents
      where id = p_row.account_id;
  elsif p_row.kind = 'transfer' then
    update public.accounts
      set current_balance_cents = current_balance_cents - p_sign * p_row.amount_cents
      where id = p_row.account_id;

    update public.accounts
      set current_balance_cents = current_balance_cents + p_sign * p_row.amount_cents
      where id = p_row.destination_account_id;
  end if;
end;
$$;


ALTER FUNCTION "public"."apply_transaction_effect"("p_row" "public"."transactions", "p_sign" smallint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."apply_transaction_effect"("p_row" "public"."transactions", "p_sign" smallint) IS 'Aplica (sinal=+1) ou reverte (sinal=-1) o efeito de uma linha de transactions sobre accounts.current_balance_cents. Usada por transactions_maintain_account_balance (SDD.md §2.15).';



CREATE OR REPLACE FUNCTION "public"."auth_users_restrict_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if new.email is null then
    return new; -- cadastro sem e-mail (ex.: telefone) não é o caso coberto por esta allow-list
  end if;

  if not exists (
    select 1 from public.allowed_signup_emails where email = lower(new.email)
  ) then
    raise exception 'signup not allowed for this email address'
      using errcode = '42501'; -- insufficient_privilege -> PostgREST/GoTrue mapeiam para 403
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."auth_users_restrict_signup"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auth_users_restrict_signup"() IS 'BE-M-12 — bloqueia INSERT em auth.users para e-mail fora de allowed_signup_emails, antes de handle_new_user() sequer rodar (trigger BEFORE INSERT roda antes do AFTER INSERT que cria o profile).';



CREATE OR REPLACE FUNCTION "public"."categories_block_delete_when_linked"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if exists (select 1 from public.transactions where category_id = old.id) then
    raise exception 'category % has linked transactions and cannot be deleted; reclassify them first (RN-09)', old.id
      using errcode = '23001';
  end if;
  if exists (select 1 from public.budget where category_id = old.id) then
    raise exception 'category % has budgets defined and cannot be deleted; remove the budgets first (RN-09, extensão RF-MVP-07)', old.id
      using errcode = '23001';
  end if;
  return old;
end;
$$;


ALTER FUNCTION "public"."categories_block_delete_when_linked"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."categories_block_delete_when_linked"() IS 'RN-09 (PRD-TECNICO.md) / DIR-05 / G-05 — impede DELETE físico de categoria com lançamento ou orçamento vinculado. SECURITY DEFINER (BE-M-13/Bloqueio 010, G-19) — categoria de sistema (user_id IS NULL) e categoria referenciada por budget/transaction de OUTRO usuário (permitido por design, categorias de sistema são compartilhadas) precisam ser enxergadas pela checagem independente de quem executa o DELETE.';



CREATE OR REPLACE FUNCTION "public"."check_backup_health"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'net', 'vault', 'pg_temp'
    AS $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'backup_edge_function_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'backup_cron_secret';

  if v_url is null or v_secret is null then
    raise warning 'BE-M-10: backup_edge_function_url/backup_cron_secret ausentes no Vault — healthcheck não disparado';
    return;
  end if;

  perform net.http_post(
    url     := v_url || '?mode=healthcheck',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body    := '{}'::jsonb
  );
end;
$$;


ALTER FUNCTION "public"."check_backup_health"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_backup_health"() IS 'BE-M-10 — dispara o healthcheck (DIR-32: alerta se o job não rodar por >26h) via pg_net. Agendada por pg_cron a cada 6h — mais frequente que a própria cadência do backup para detectar falha de agendamento a tempo.';



CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_user_id    uuid := (event->>'user_id')::uuid;
  v_session_id uuid;
  v_claims     jsonb;
  v_verified   boolean;
begin
  v_claims := coalesce(event->'claims', '{}'::jsonb);

  -- session_id pode, em tese, vir ausente/nulo do evento (ex.: emissão de
  -- token fora de um fluxo de sessão interativa). Nesse caso não há como
  -- ter um desafio de MFA associado: segue sem marcar o claim, em vez de
  -- lançar exceção e derrubar a emissão do JWT.
  begin
    v_session_id := (v_claims->>'session_id')::uuid;
  exception when others then
    v_session_id := null;
  end;

  v_verified := false;

  if v_user_id is not null and v_session_id is not null then
    select exists (
      select 1
      from public.email_mfa_challenges
      where user_id = v_user_id
        and session_id = v_session_id
        and consumed_at is not null
    )
    into v_verified;
  end if;

  if v_verified then
    v_claims := jsonb_set(v_claims, '{app_email_mfa_verified}', to_jsonb('true'::text));
  end if;

  event := jsonb_set(event, '{claims}', v_claims);
  return event;
end;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") IS 'F1-BE-14/SDD.md §3/RF11: hook auth.hook.custom_access_token (ver supabase/config.toml). SECURITY DEFINER — roda como dono da função (postgres, com BYPASSRLS neste ambiente), por isso enxerga email_mfa_challenges mesmo com a tabela em RLS deny-all. Chamado pelo GoTrue como supabase_auth_admin a cada emissão/renovação de access token; nunca deve ser chamável pelo client (ver REVOKE abaixo).';



CREATE OR REPLACE FUNCTION "public"."fn_clear_due_transactions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  update public.transactions
  set status = 'cleared'
  where status = 'pending'
    and transaction_date <= (now() at time zone 'America/Sao_Paulo')::date;
end;
$$;


ALTER FUNCTION "public"."fn_clear_due_transactions"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_clear_due_transactions"() IS 'F1-BE-09: promove transactions.status de pending para cleared quando transaction_date <= hoje (America/Sao_Paulo -- mesma expressão do trigger transactions_set_status, para consistência). SECURITY DEFINER para atualizar linhas de todos os usuários ignorando RLS. Chamada exclusivamente pelo job pg_cron fn-clear-due-transactions (a cada 15 min) -- nunca pelo client (ver REVOKE abaixo).';



CREATE OR REPLACE FUNCTION "public"."get_budget_status"("p_month" "date" DEFAULT NULL::"date") RETURNS TABLE("budget_id" "uuid", "category_id" "uuid", "category_name" "text", "month" "date", "limit_cents" bigint, "spent_cents" bigint, "alert_threshold_pct" smallint, "pct_spent" numeric, "alert_level" "text")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  with v_bounds as (
    select
      date_trunc('month', coalesce(p_month, (now() at time zone 'America/Sao_Paulo')::date))::date as month_start,
      (date_trunc('month', coalesce(p_month, (now() at time zone 'America/Sao_Paulo')::date))::date + interval '1 month')::date as month_end
  ),
  v_spent as (
    select
      t.category_id,
      coalesce(sum(t.amount_cents), 0)::bigint as spent_cents
    from public.transactions t, v_bounds b
    where t.user_id = auth.uid()
      and t.kind = 'expense'
      and t.transaction_date >= b.month_start
      and t.transaction_date <  b.month_end
    group by t.category_id
  )
  select
    bu.id as budget_id,
    bu.category_id,
    c.name as category_name,
    bu.month,
    bu.limit_cents,
    coalesce(vs.spent_cents, 0)::bigint as spent_cents,
    bu.alert_threshold_pct,
    round((coalesce(vs.spent_cents, 0)::numeric / nullif(bu.limit_cents, 0)::numeric) * 100, 2) as pct_spent,
    case
      when coalesce(vs.spent_cents, 0) > bu.limit_cents then 'exceeded'
      when coalesce(vs.spent_cents, 0) >= (bu.limit_cents * bu.alert_threshold_pct / 100.0) then 'warning'
      else 'none'
    end as alert_level
  from public.budget bu
  join public.categories c on c.id = bu.category_id
  left join v_spent vs on vs.category_id = bu.category_id
  cross join v_bounds b
  where bu.user_id = auth.uid()
    and bu.month = b.month_start;
$$;


ALTER FUNCTION "public"."get_budget_status"("p_month" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_budget_status"("p_month" "date") IS 'RF-MVP-07 AC2-4, RN-04 — % gasto vs. teto por orçamento do mês, com alert_level none/warning (>= alert_threshold_pct, padrão 80%)/exceeded (> 100%). Criada por BE-M-08 (ADR-012, entidade Budget de BE-M-01).';



CREATE OR REPLACE FUNCTION "public"."get_month_provision"() RETURNS TABLE("current_total_balance_cents" bigint, "pending_income_cents" bigint, "pending_expense_cents" bigint, "provisioned_balance_cents" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  with v_bounds as (
    select
      date_trunc('month', (now() at time zone 'America/Sao_Paulo')::date)::date as month_start,
      (date_trunc('month', (now() at time zone 'America/Sao_Paulo')::date)::date + interval '1 month')::date as month_end
  ),
  v_balance as (
    select coalesce(sum(a.current_balance_cents), 0)::bigint as current_total_balance_cents
    from public.accounts a
    where a.user_id = auth.uid()
      and a.is_active = true
  ),
  v_pending as (
    select
      coalesce(sum(t.amount_cents) filter (where t.kind = 'income'), 0)::bigint as pending_income_cents,
      coalesce(sum(t.amount_cents) filter (where t.kind = 'expense'), 0)::bigint as pending_expense_cents
    from public.transactions t, v_bounds b
    where t.user_id = auth.uid()
      and t.status = 'pending'
      and t.transaction_date >= b.month_start
      and t.transaction_date < b.month_end
  )
  select
    vb.current_total_balance_cents,
    vp.pending_income_cents,
    vp.pending_expense_cents,
    (vb.current_total_balance_cents + vp.pending_income_cents - vp.pending_expense_cents)::bigint as provisioned_balance_cents
  from v_balance vb, v_pending vp;
$$;


ALTER FUNCTION "public"."get_month_provision"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_month_provision"() IS 'SDD.md §2.8: provisionamento do mês corrente (America/Sao_Paulo) = saldo atual das contas ativas + transações pending do mês (income soma, expense subtrai). Sempre retorna 1 linha, mesmo para usuário sem contas/transações. SECURITY INVOKER: respeita a RLS normal de accounts/transactions. Não existe RPC separada de saldo por conta -- SELECT direto em accounts já resolve isso via RLS.';



CREATE OR REPLACE FUNCTION "public"."get_month_transaction_count"("p_month" "date" DEFAULT NULL::"date") RETURNS integer
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select count(*)::integer
  from public.transactions t
  where t.user_id = auth.uid()
    and t.transaction_date >= date_trunc('month', coalesce(p_month, (now() at time zone 'America/Sao_Paulo')::date))::date
    and t.transaction_date <  (date_trunc('month', coalesce(p_month, (now() at time zone 'America/Sao_Paulo')::date))::date + interval '1 month')
$$;


ALTER FUNCTION "public"."get_month_transaction_count"("p_month" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_month_transaction_count"("p_month" "date") IS 'RF-MVP-06 AC3 — total de lançamentos do usuário no mês (padrão: mês corrente). Criada por BE-M-01/BE-M-07 (ADR-012, achado de auditoria: nenhuma RPC existente cobria essa contagem).';



CREATE OR REPLACE FUNCTION "public"."get_monthly_category_summary"("p_month" "date" DEFAULT NULL::"date") RETURNS TABLE("category_id" "uuid", "category_name" "text", "kind" "public"."transaction_kind", "total_cents" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  with v_bounds as (
    select
      date_trunc('month', coalesce(p_month, (now() at time zone 'America/Sao_Paulo')::date))::date as month_start,
      (date_trunc('month', coalesce(p_month, (now() at time zone 'America/Sao_Paulo')::date))::date + interval '1 month')::date as month_end
  )
  select
    t.category_id,
    c.name as category_name,
    t.kind,
    sum(t.amount_cents)::bigint as total_cents
  from public.transactions t
  join public.categories c on c.id = t.category_id
  cross join v_bounds b
  where t.user_id = auth.uid()
    and t.kind <> 'transfer'
    and t.transaction_date >= b.month_start
    and t.transaction_date < b.month_end
  group by t.category_id, c.name, t.kind;
$$;


ALTER FUNCTION "public"."get_monthly_category_summary"("p_month" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_monthly_category_summary"("p_month" "date") IS 'RF04 (SDD.md §2.14): resumo de receitas/despesas do mês por categoria, para os gráficos de distribuição de gastos e o resumo do mês vigente do dashboard. p_month NULL usa o mês corrente em America/Sao_Paulo; caso contrário é truncado para o primeiro dia do mês daquela data. Exclui kind=transfer (sem categoria de análise de gasto). Inclui status pending e cleared. SECURITY INVOKER: respeita a RLS normal de transactions/categories.';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_pin"("new_pin" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $_$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if new_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN must be numeric with 4 to 6 digits';
  end if;

  update public.profiles
  set pin_hash = extensions.crypt(new_pin, extensions.gen_salt('bf')),
      pin_failed_attempts = 0,
      pin_locked_until = null
  where id = auth.uid();

  if not found then
    raise exception 'profile not found';
  end if;
end;
$_$;


ALTER FUNCTION "public"."set_pin"("new_pin" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_pin"("new_pin" "text") IS 'RF-MVP-08 — configura/troca o PIN local (mecanismo secundário/servidor, não o gate de desbloqueio local — ver AUDITORIA-BE-M-00.md Seção 7). Promovida a SECURITY DEFINER por BE-M-09 para permitir revogar o acesso direto de coluna do chamador a pin_hash.';



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transactions_block_inactive_account"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_account_active     boolean;
  v_destination_active boolean;
begin
  select is_active into v_account_active
  from public.accounts
  where id = new.account_id;

  if v_account_active is false then
    raise exception 'account % is inactive and cannot receive new transactions', new.account_id;
  end if;

  if new.destination_account_id is not null then
    select is_active into v_destination_active
    from public.accounts
    where id = new.destination_account_id;

    if v_destination_active is false then
      raise exception 'destination account % is inactive and cannot receive new transactions', new.destination_account_id;
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."transactions_block_inactive_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transactions_maintain_account_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if tg_op = 'INSERT' then
    perform public.apply_transaction_effect(new, 1::smallint);
    return new;
  elsif tg_op = 'DELETE' then
    perform public.apply_transaction_effect(old, (-1)::smallint);
    return old;
  elsif tg_op = 'UPDATE' then
    perform public.apply_transaction_effect(old, (-1)::smallint);
    perform public.apply_transaction_effect(new, 1::smallint);
    return new;
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."transactions_maintain_account_balance"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."transactions_maintain_account_balance"() IS 'Trigger function AFTER INSERT/UPDATE/DELETE em transactions (F1-BE-08, SDD.md §2.15). Corrigida em 20260828050000: os sinais passados a apply_transaction_effect precisam de cast explícito para smallint (literal inteiro sem cast não casa com a sobrecarga smallint na resolução de função do Postgres -- int4->int2 é assignment cast, não implicit cast).';



CREATE OR REPLACE FUNCTION "public"."transactions_set_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_today date;
begin
  v_today := (now() at time zone 'America/Sao_Paulo')::date;

  if new.transaction_date > v_today then
    new.status := 'pending';
  else
    new.status := 'cleared';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."transactions_set_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_backup_export"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'net', 'vault', 'pg_temp'
    AS $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'backup_edge_function_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'backup_cron_secret';

  if v_url is null or v_secret is null then
    raise warning 'BE-M-10: backup_edge_function_url/backup_cron_secret ausentes no Vault — job não disparado';
    return;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body    := '{}'::jsonb
  );
end;
$$;


ALTER FUNCTION "public"."trigger_backup_export"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_backup_export"() IS 'BE-M-10 — dispara o export lógico diário via pg_net (chamada assíncrona à Edge Function backup-export). Agendada por pg_cron, cadência diária (ADR-009).';



CREATE OR REPLACE FUNCTION "public"."validate_category_hierarchy"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_parent_user_id   uuid;
  v_parent_parent_id uuid;
  v_has_children     boolean;
begin
  if new.parent_category_id is not null then
    if new.parent_category_id = new.id then
      raise exception 'a category cannot be its own parent';
    end if;

    select user_id, parent_category_id
    into v_parent_user_id, v_parent_parent_id
    from public.categories
    where id = new.parent_category_id;

    if not found then
      raise exception 'parent_category_id % does not reference an existing category', new.parent_category_id;
    end if;

    if v_parent_user_id is distinct from new.user_id then
      raise exception 'parent category must belong to the same user (or both be system categories)';
    end if;

    if v_parent_parent_id is not null then
      raise exception 'category hierarchy is limited to 1 level: parent category % already has its own parent', new.parent_category_id;
    end if;

    -- Regra 4 (correção): a categoria que está recebendo um pai não pode já
    -- ter filhos — senão a cadeia vira 3 níveis pelo lado de cima.
    select exists (
      select 1
      from public.categories
      where parent_category_id = new.id
    )
    into v_has_children;

    if v_has_children then
      raise exception 'category % already has child categories and cannot itself receive a parent', new.id;
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_category_hierarchy"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_category_hierarchy"() IS 'Valida hierarquia de categorias (SDD.md §2.5): mesmo user_id do pai, profundidade máxima de 1 nível nos dois sentidos (pai não pode já ter pai; categoria com filhos não pode receber pai), e proíbe auto-referência. Corrigida em 20260828010500 — ver comentário no topo do arquivo.';



CREATE OR REPLACE FUNCTION "public"."verify_pin"("candidate_pin" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $$
declare
  v_uid               uuid := auth.uid();
  v_pin_hash          text;
  v_pin_failed_attempts integer;
  v_pin_locked_until  timestamptz;
  v_match             boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select pin_hash, pin_failed_attempts, pin_locked_until
  into v_pin_hash, v_pin_failed_attempts, v_pin_locked_until
  from public.profiles
  where id = v_uid
  for update;

  if not found then
    raise exception 'profile not found';
  end if;

  if v_pin_hash is null then
    raise exception 'pin not configured';
  end if;

  if v_pin_locked_until is not null and v_pin_locked_until > now() then
    raise exception 'pin locked until %', v_pin_locked_until;
  end if;

  v_match := (extensions.crypt(candidate_pin, v_pin_hash) = v_pin_hash);

  if v_match then
    update public.profiles
    set pin_failed_attempts = 0,
        pin_locked_until = null
    where id = v_uid;

    return true;
  end if;

  v_pin_failed_attempts := v_pin_failed_attempts + 1;

  if v_pin_failed_attempts >= 5 then
    update public.profiles
    set pin_failed_attempts = 0,
        pin_locked_until = now() + interval '15 minutes'
    where id = v_uid;
  else
    update public.profiles
    set pin_failed_attempts = v_pin_failed_attempts
    where id = v_uid;
  end if;

  return false;
end;
$$;


ALTER FUNCTION "public"."verify_pin"("candidate_pin" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."verify_pin"("candidate_pin" "text") IS 'RF-MVP-08 — revalidação server-side pontual do PIN (mecanismo secundário, não o gate de desbloqueio local — ver AUDITORIA-BE-M-00.md Seção 7). Promovida a SECURITY DEFINER por BE-M-09, mesmo racional de set_pin.';



CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."account_type" NOT NULL,
    "currency" character(3) NOT NULL,
    "initial_balance_cents" bigint NOT NULL,
    "current_balance_cents" bigint NOT NULL,
    "color" "text",
    "icon" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."accounts" IS 'Contas financeiras do usuário (SDD.md §2.2): corrente, poupança, carteira ou investimento. Saldo negativo é permitido livremente (decisão do usuário) — sem CHECK de saldo mínimo.';



COMMENT ON COLUMN "public"."accounts"."current_balance_cents" IS 'Mantido por trigger, nunca setado diretamente pelo client: nasce igual a initial_balance_cents (accounts_init_current_balance) e é deslocado quando initial_balance_cents é editado depois (accounts_adjust_balance_on_initial_update). Efeito de transações lançadas é responsabilidade de trigger futuro, fora do escopo desta migration.';



CREATE TABLE IF NOT EXISTS "public"."allowed_signup_emails" (
    "email" "text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."allowed_signup_emails" OWNER TO "postgres";


COMMENT ON TABLE "public"."allowed_signup_emails" IS 'BE-M-12 — allow-list de e-mail para cadastro em auth.users. RNF-09 (usuário único): só o(s) e-mail(s) aqui podem completar signup. Gerenciada só via service_role/migration — RLS habilitada sem nenhuma policy (nega tudo por padrão a anon/authenticated).';



CREATE TABLE IF NOT EXISTS "public"."backup_export_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "finished_at" timestamp with time zone NOT NULL,
    "status" "text" NOT NULL,
    "object_key" "text",
    "size_bytes" bigint,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "backup_export_log_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'failure'::"text"])))
);


ALTER TABLE "public"."backup_export_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."backup_export_log" IS 'BE-M-10 — log de cada execução do export lógico diário de backup (DIR-32, "execução consultável"). Gravada pela Edge Function backup-export via service_role; sem policy nenhuma para anon/authenticated (RLS habilitada, nega tudo por padrão — não é dado de usuário, é metadado operacional).';



CREATE TABLE IF NOT EXISTS "public"."budget" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "month" "date" NOT NULL,
    "limit_cents" bigint NOT NULL,
    "alert_threshold_pct" smallint DEFAULT 80 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "budget_alert_threshold_range" CHECK ((("alert_threshold_pct" >= 1) AND ("alert_threshold_pct" <= 100))),
    CONSTRAINT "budget_limit_positive" CHECK (("limit_cents" > 0)),
    CONSTRAINT "budget_month_is_first_of_month" CHECK (("month" = ("date_trunc"('month'::"text", ("month")::timestamp with time zone))::"date"))
);


ALTER TABLE "public"."budget" OWNER TO "postgres";


COMMENT ON TABLE "public"."budget" IS 'RF-MVP-07 — teto de orçamento por categoria/mês. Criada por BE-M-01 (ADR-012, entidade ausente nº 1 do Plano de Evolução).';



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "parent_category_id" "uuid",
    "name" "text" NOT NULL,
    "icon" "text",
    "color" "text",
    "kind" "public"."category_kind" NOT NULL,
    "is_system_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."categories" IS 'Categorias de transação (SDD.md §2.5). user_id NULL = categoria padrão do sistema, visível a todos. Hierarquia limitada a 1 nível (ver trigger validate_category_hierarchy).';



COMMENT ON COLUMN "public"."categories"."user_id" IS 'NULL para categorias padrão do sistema (is_system_default = true). Caso contrário, dona da categoria.';



COMMENT ON COLUMN "public"."categories"."parent_category_id" IS 'Auto-referência para categoria-pai. Máximo 1 nível de profundidade (não permite sub-subcategoria) — aplicado via trigger, não expressável como CHECK simples.';



CREATE TABLE IF NOT EXISTS "public"."email_mfa_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "code_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "consumed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_mfa_challenges" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_mfa_challenges" IS 'RF11/SDD.md §2.16: desafios de 2º fator de login por e-mail. Tabela de infraestrutura de autenticação, só acessada pela Edge Function auth-email-mfa (service role) e pelo custom_access_token_hook (SECURITY DEFINER) — nunca pelo client via PostgREST. RLS habilitada sem policy/GRANT (deny-all intencional, ver comentário no topo da migration).';



COMMENT ON COLUMN "public"."email_mfa_challenges"."session_id" IS 'id da sessão GoTrue (claim session_id do JWT emitido no passo 1 do login). A verificação vale só para esta sessão, não para o usuário como um todo.';



COMMENT ON COLUMN "public"."email_mfa_challenges"."code_hash" IS 'SHA-256 do código de 6 dígitos. O código em claro nunca é persistido.';



COMMENT ON COLUMN "public"."email_mfa_challenges"."expires_at" IS 'created_at + 10 min, calculado no INSERT pela Edge Function auth-email-mfa — sem default aqui.';



COMMENT ON COLUMN "public"."email_mfa_challenges"."attempts" IS 'Tentativas de verificação incorretas nesta rodada; código invalidado ao atingir 5 (exige reenvio).';



COMMENT ON COLUMN "public"."email_mfa_challenges"."consumed_at" IS 'Gravado no verify bem-sucedido — código é de uso único. Nulo enquanto pendente.';



COMMENT ON COLUMN "public"."email_mfa_challenges"."created_at" IS 'Também usado para o rate limit de reenvio (cooldown de 60s e máx. 5 envios/30min por user_id), calculado por contagem de linhas — sem coluna dedicada.';



CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid",
    "credit_card_id" "uuid",
    "type" "public"."payment_method_type" NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_system_default" boolean DEFAULT false NOT NULL,
    CONSTRAINT "payment_methods_account_or_card_check" CHECK (((("type" = 'credit_card'::"public"."payment_method_type") AND ("credit_card_id" IS NOT NULL)) OR (("type" <> 'credit_card'::"public"."payment_method_type") AND ("account_id" IS NOT NULL))))
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_methods" IS 'Meios de pagamento do usuário (SDD.md §2.4, RF02): pix, débito, crédito, boleto ou dinheiro. Meios não-cartão apontam para uma account; cartão de crédito aponta para credit_card_id.';



COMMENT ON COLUMN "public"."payment_methods"."credit_card_id" IS 'Referência a credit_cards.id, tabela que só existe a partir da Fase 2 (F2-BE-01). Sem FK constraint por enquanto: coluna já existe desde a Fase 1 por decisão do SDD.md §2.4, mas a constraint de FK será adicionada via ALTER TABLE na migration da Fase 2 que cria credit_cards (F2-BE-01/F2-BE-05), já que não é possível referenciar uma tabela inexistente.';



COMMENT ON COLUMN "public"."payment_methods"."is_system_default" IS 'RF-MVP-02 AC1/AC3 — true para as formas pré-cadastradas (Pix/Débito/Boleto/Dinheiro), não editáveis nem excluíveis pelo usuário.';



COMMENT ON CONSTRAINT "payment_methods_account_or_card_check" ON "public"."payment_methods" IS 'SDD.md §2.4: type=credit_card exige credit_card_id preenchido; qualquer outro type exige account_id preenchido.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "base_currency" character(3) DEFAULT 'BRL'::"bpchar" NOT NULL,
    "pin_hash" "text",
    "pin_failed_attempts" integer DEFAULT 0 NOT NULL,
    "pin_locked_until" timestamp with time zone,
    "locale" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Estende auth.users (SDD.md §2.1). Uma linha por usuário, criada automaticamente pelo trigger on_auth_user_created.';



COMMENT ON COLUMN "public"."profiles"."pin_hash" IS 'Hash bcrypt (pgcrypto crypt()/gen_salt(''bf'')) do PIN local, nunca o PIN em texto plano. Ver RPCs set_pin/verify_pin.';



CREATE TABLE IF NOT EXISTS "public"."webauthn_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "challenge" "text" NOT NULL,
    "ceremony_type" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "consumed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "webauthn_challenges_ceremony_type_check" CHECK (("ceremony_type" = ANY (ARRAY['registration'::"text", 'authentication'::"text"])))
);


ALTER TABLE "public"."webauthn_challenges" OWNER TO "postgres";


COMMENT ON TABLE "public"."webauthn_challenges" IS 'BE-M-09 — desafio WebAuthn efêmero entre a chamada de options e a de verify. TTL curto (expires_at); consumido (consumed_at) na primeira verificação bem-sucedida ou malsucedida, nunca reutilizável. Só acessível via service_role.';



CREATE TABLE IF NOT EXISTS "public"."webauthn_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "credential_id" "text" NOT NULL,
    "public_key" "bytea" NOT NULL,
    "sign_count" bigint DEFAULT 0 NOT NULL,
    "device_label" "text",
    "last_used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."webauthn_credentials" OWNER TO "postgres";


COMMENT ON TABLE "public"."webauthn_credentials" IS 'Credenciais WebAuthn (biometria/chave de segurança) para desbloqueio local por dispositivo (SDD.md §3). Uma linha por credencial/dispositivo registrado.';



COMMENT ON COLUMN "public"."webauthn_credentials"."credential_id" IS 'ID da credencial WebAuthn (base64url), único globalmente.';



COMMENT ON COLUMN "public"."webauthn_credentials"."public_key" IS 'Chave pública COSE da credencial, usada para verificar assinaturas na cerimônia de autenticação.';



COMMENT ON COLUMN "public"."webauthn_credentials"."sign_count" IS 'Contador de assinaturas da credencial (anti-clonagem). Atualizado apenas pela Edge Function webauthn-authenticate via service role.';



COMMENT ON COLUMN "public"."webauthn_credentials"."device_label" IS 'Rótulo opcional definido pelo usuário, ex. "iPhone de Leandro".';



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."allowed_signup_emails"
    ADD CONSTRAINT "allowed_signup_emails_pkey" PRIMARY KEY ("email");



ALTER TABLE ONLY "public"."backup_export_log"
    ADD CONSTRAINT "backup_export_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget"
    ADD CONSTRAINT "budget_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget"
    ADD CONSTRAINT "budget_user_category_month_unique" UNIQUE ("user_id", "category_id", "month");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_user_id_name_kind_key" UNIQUE ("user_id", "name", "kind");



ALTER TABLE ONLY "public"."email_mfa_challenges"
    ADD CONSTRAINT "email_mfa_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_external_ref_unique" UNIQUE ("user_id", "external_ref");



ALTER TABLE ONLY "public"."webauthn_challenges"
    ADD CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webauthn_credentials"
    ADD CONSTRAINT "webauthn_credentials_credential_id_key" UNIQUE ("credential_id");



ALTER TABLE ONLY "public"."webauthn_credentials"
    ADD CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY ("id");



CREATE INDEX "backup_export_log_status_finished_at_idx" ON "public"."backup_export_log" USING "btree" ("status", "finished_at" DESC);



CREATE INDEX "categories_parent_category_id_idx" ON "public"."categories" USING "btree" ("parent_category_id");



CREATE INDEX "categories_user_id_idx" ON "public"."categories" USING "btree" ("user_id");



CREATE INDEX "email_mfa_challenges_user_created_idx" ON "public"."email_mfa_challenges" USING "btree" ("user_id", "created_at");



CREATE INDEX "email_mfa_challenges_user_session_idx" ON "public"."email_mfa_challenges" USING "btree" ("user_id", "session_id");



CREATE INDEX "payment_methods_account_id_idx" ON "public"."payment_methods" USING "btree" ("account_id");



CREATE INDEX "payment_methods_user_id_idx" ON "public"."payment_methods" USING "btree" ("user_id");



CREATE INDEX "transactions_account_id_idx" ON "public"."transactions" USING "btree" ("account_id");



CREATE INDEX "transactions_category_id_idx" ON "public"."transactions" USING "btree" ("category_id");



CREATE INDEX "transactions_destination_account_id_idx" ON "public"."transactions" USING "btree" ("destination_account_id");



CREATE INDEX "transactions_payment_method_id_idx" ON "public"."transactions" USING "btree" ("payment_method_id");



CREATE INDEX "transactions_transaction_date_idx" ON "public"."transactions" USING "btree" ("transaction_date");



CREATE INDEX "transactions_user_id_idx" ON "public"."transactions" USING "btree" ("user_id");



CREATE INDEX "webauthn_challenges_user_id_ceremony_idx" ON "public"."webauthn_challenges" USING "btree" ("user_id", "ceremony_type", "expires_at");



CREATE INDEX "webauthn_credentials_user_id_idx" ON "public"."webauthn_credentials" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "accounts_adjust_balance_on_initial_update" BEFORE UPDATE OF "initial_balance_cents" ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."accounts_adjust_balance_on_initial_update"();



CREATE OR REPLACE TRIGGER "accounts_after_insert_seed_default_payment_methods" AFTER INSERT ON "public"."accounts" FOR EACH ROW WHEN (("new"."is_active" = true)) EXECUTE FUNCTION "public"."accounts_seed_default_payment_methods"();



CREATE OR REPLACE TRIGGER "accounts_before_delete_block_linked" BEFORE DELETE ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."accounts_block_delete_when_linked"();



CREATE OR REPLACE TRIGGER "accounts_init_current_balance" BEFORE INSERT ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."accounts_init_current_balance"();



CREATE OR REPLACE TRIGGER "accounts_set_updated_at" BEFORE UPDATE ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "budget_set_updated_at" BEFORE UPDATE ON "public"."budget" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "categories_before_delete_block_linked" BEFORE DELETE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."categories_block_delete_when_linked"();



CREATE OR REPLACE TRIGGER "categories_set_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "categories_validate_hierarchy" BEFORE INSERT OR UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."validate_category_hierarchy"();



CREATE OR REPLACE TRIGGER "payment_methods_set_updated_at" BEFORE UPDATE ON "public"."payment_methods" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "transactions_before_insert_block_inactive_account" BEFORE INSERT ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."transactions_block_inactive_account"();



CREATE OR REPLACE TRIGGER "transactions_before_insert_set_status" BEFORE INSERT ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."transactions_set_status"();



CREATE OR REPLACE TRIGGER "transactions_maintain_account_balance" AFTER INSERT OR DELETE OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."transactions_maintain_account_balance"();



CREATE OR REPLACE TRIGGER "transactions_set_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget"
    ADD CONSTRAINT "budget_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget"
    ADD CONSTRAINT "budget_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_mfa_challenges"
    ADD CONSTRAINT "email_mfa_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_destination_account_id_fkey" FOREIGN KEY ("destination_account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webauthn_challenges"
    ADD CONSTRAINT "webauthn_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webauthn_credentials"
    ADD CONSTRAINT "webauthn_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "accounts_delete_own" ON "public"."accounts" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text")));



CREATE POLICY "accounts_insert_own" ON "public"."accounts" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text")));



CREATE POLICY "accounts_select_own" ON "public"."accounts" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text")));



CREATE POLICY "accounts_update_own" ON "public"."accounts" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text")));



ALTER TABLE "public"."allowed_signup_emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."backup_export_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budget" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "budget_delete_own" ON "public"."budget" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text")));



CREATE POLICY "budget_insert_own" ON "public"."budget" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."categories" "c"
  WHERE (("c"."id" = "budget"."category_id") AND (("c"."user_id" = "auth"."uid"()) OR ("c"."user_id" IS NULL)))))));



CREATE POLICY "budget_select_own" ON "public"."budget" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text")));



CREATE POLICY "budget_update_own" ON "public"."budget" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."categories" "c"
  WHERE (("c"."id" = "budget"."category_id") AND (("c"."user_id" = "auth"."uid"()) OR ("c"."user_id" IS NULL)))))));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_delete_own" ON "public"."categories" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND ("is_system_default" = false) AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text")));



CREATE POLICY "categories_insert_own" ON "public"."categories" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND ("is_system_default" = false) AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text")));



CREATE POLICY "categories_select" ON "public"."categories" FOR SELECT TO "authenticated" USING (((("user_id" = "auth"."uid"()) OR ("user_id" IS NULL)) AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text")));



CREATE POLICY "categories_update_own" ON "public"."categories" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND ("is_system_default" = false) AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text"))) WITH CHECK ((("user_id" = "auth"."uid"()) AND ("is_system_default" = false) AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text")));



ALTER TABLE "public"."email_mfa_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_methods_delete_own" ON "public"."payment_methods" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("is_system_default" = false) AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text")));



CREATE POLICY "payment_methods_insert_own" ON "public"."payment_methods" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text")));



CREATE POLICY "payment_methods_select_own" ON "public"."payment_methods" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text")));



CREATE POLICY "payment_methods_update_own" ON "public"."payment_methods" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("is_system_default" = false) AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") AND ("is_system_default" = false) AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transactions_delete_own" ON "public"."transactions" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text")));



CREATE POLICY "transactions_insert_own" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."accounts" "a"
  WHERE (("a"."id" = "transactions"."account_id") AND ("a"."user_id" = "auth"."uid"())))) AND (("category_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."categories" "c"
  WHERE (("c"."id" = "transactions"."category_id") AND (("c"."user_id" = "auth"."uid"()) OR ("c"."user_id" IS NULL)))))) AND (("payment_method_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."payment_methods" "pm"
  WHERE (("pm"."id" = "transactions"."payment_method_id") AND ("pm"."user_id" = "auth"."uid"()))))) AND (("destination_account_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."accounts" "da"
  WHERE (("da"."id" = "transactions"."destination_account_id") AND ("da"."user_id" = "auth"."uid"())))))));



CREATE POLICY "transactions_select_own" ON "public"."transactions" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text")));



CREATE POLICY "transactions_update_own" ON "public"."transactions" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") AND (("auth"."jwt"() ->> 'app_email_mfa_verified'::"text") = 'true'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."accounts" "a"
  WHERE (("a"."id" = "transactions"."account_id") AND ("a"."user_id" = "auth"."uid"())))) AND (("category_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."categories" "c"
  WHERE (("c"."id" = "transactions"."category_id") AND (("c"."user_id" = "auth"."uid"()) OR ("c"."user_id" IS NULL)))))) AND (("payment_method_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."payment_methods" "pm"
  WHERE (("pm"."id" = "transactions"."payment_method_id") AND ("pm"."user_id" = "auth"."uid"()))))) AND (("destination_account_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."accounts" "da"
  WHERE (("da"."id" = "transactions"."destination_account_id") AND ("da"."user_id" = "auth"."uid"())))))));



ALTER TABLE "public"."webauthn_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webauthn_credentials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webauthn_credentials_delete_own" ON "public"."webauthn_credentials" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "webauthn_credentials_insert_own" ON "public"."webauthn_credentials" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "webauthn_credentials_select_own" ON "public"."webauthn_credentials" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."accounts_adjust_balance_on_initial_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."accounts_adjust_balance_on_initial_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."accounts_adjust_balance_on_initial_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."accounts_block_delete_when_linked"() TO "anon";
GRANT ALL ON FUNCTION "public"."accounts_block_delete_when_linked"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."accounts_block_delete_when_linked"() TO "service_role";



GRANT ALL ON FUNCTION "public"."accounts_init_current_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."accounts_init_current_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."accounts_init_current_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."accounts_seed_default_payment_methods"() TO "anon";
GRANT ALL ON FUNCTION "public"."accounts_seed_default_payment_methods"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."accounts_seed_default_payment_methods"() TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_transaction_effect"("p_row" "public"."transactions", "p_sign" smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."apply_transaction_effect"("p_row" "public"."transactions", "p_sign" smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_transaction_effect"("p_row" "public"."transactions", "p_sign" smallint) TO "service_role";



GRANT ALL ON FUNCTION "public"."auth_users_restrict_signup"() TO "anon";
GRANT ALL ON FUNCTION "public"."auth_users_restrict_signup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_users_restrict_signup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."categories_block_delete_when_linked"() TO "anon";
GRANT ALL ON FUNCTION "public"."categories_block_delete_when_linked"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."categories_block_delete_when_linked"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_backup_health"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_backup_health"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_backup_health"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "supabase_auth_admin";



REVOKE ALL ON FUNCTION "public"."fn_clear_due_transactions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_clear_due_transactions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_budget_status"("p_month" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_budget_status"("p_month" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_budget_status"("p_month" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_month_provision"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_month_provision"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_month_provision"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_month_transaction_count"("p_month" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_month_transaction_count"("p_month" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_month_transaction_count"("p_month" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_category_summary"("p_month" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_category_summary"("p_month" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_category_summary"("p_month" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_pin"("new_pin" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_pin"("new_pin" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_pin"("new_pin" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_pin"("new_pin" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."transactions_block_inactive_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."transactions_block_inactive_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."transactions_block_inactive_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."transactions_maintain_account_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."transactions_maintain_account_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."transactions_maintain_account_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."transactions_set_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."transactions_set_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."transactions_set_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_backup_export"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_backup_export"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_backup_export"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_category_hierarchy"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_category_hierarchy"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_category_hierarchy"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."verify_pin"("candidate_pin" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."verify_pin"("candidate_pin" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_pin"("candidate_pin" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_pin"("candidate_pin" "text") TO "service_role";
























GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."allowed_signup_emails" TO "anon";
GRANT ALL ON TABLE "public"."allowed_signup_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."allowed_signup_emails" TO "service_role";



GRANT ALL ON TABLE "public"."backup_export_log" TO "anon";
GRANT ALL ON TABLE "public"."backup_export_log" TO "authenticated";
GRANT ALL ON TABLE "public"."backup_export_log" TO "service_role";



GRANT ALL ON TABLE "public"."budget" TO "anon";
GRANT ALL ON TABLE "public"."budget" TO "authenticated";
GRANT ALL ON TABLE "public"."budget" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."email_mfa_challenges" TO "anon";
GRANT ALL ON TABLE "public"."email_mfa_challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."email_mfa_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT("id") ON TABLE "public"."profiles" TO "anon";



GRANT SELECT("full_name"),UPDATE("full_name") ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT("full_name") ON TABLE "public"."profiles" TO "anon";



GRANT SELECT("avatar_url"),UPDATE("avatar_url") ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT("avatar_url") ON TABLE "public"."profiles" TO "anon";



GRANT SELECT("base_currency"),UPDATE("base_currency") ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT("base_currency") ON TABLE "public"."profiles" TO "anon";



GRANT SELECT("locale"),UPDATE("locale") ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT("locale") ON TABLE "public"."profiles" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT("created_at") ON TABLE "public"."profiles" TO "anon";



GRANT SELECT("updated_at") ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT("updated_at") ON TABLE "public"."profiles" TO "anon";



GRANT ALL ON TABLE "public"."webauthn_challenges" TO "anon";
GRANT ALL ON TABLE "public"."webauthn_challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."webauthn_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."webauthn_credentials" TO "anon";
GRANT ALL ON TABLE "public"."webauthn_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."webauthn_credentials" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































