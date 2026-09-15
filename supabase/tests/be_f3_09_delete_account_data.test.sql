-- BE-F3-09 — Testes de `public.delete_user_data` (ADR-011, "Exclusão de
-- conta"). Cobre o critério de aceite (a) da tarefa: "remove todas as linhas
-- de `public` associadas ao `user_id` (respeitando dependência de FK/
-- cascade)" — com dado REAL em TODA tabela "ownable" hoje existente (auditada
-- linha a linha no cabeçalho da migration
-- `20260915090000_be_f3_09_delete_account_data.sql`), mais isolamento: um
-- segundo usuário ("de controle") com as mesmas linhas em cada tabela NUNCA é
-- tocado.
--
-- A remoção de objetos de Storage (exports pendentes) e do usuário em
-- Supabase Auth são responsabilidade da Edge Function `delete-account`
-- (Storage API / Admin API do GoTrue, nunca SQL puro — mesmo princípio já
-- documentado em `be_f3_08_data_retention_purge_jobs.test.sql`), cobertas por
-- `supabase/functions/delete-account/lib.test.ts` (lógica pura) + smoke test
-- real no deploy (mesmo padrão de toda outra Edge Function deste projeto).
--
-- Roda como `postgres` (superuser/owner, bypassa RLS) — `delete_user_data` é
-- SECURITY DEFINER e só é de fato invocável por `service_role` em produção
-- (GRANT/REVOKE da própria migration), mas nada nesta função depende de
-- `auth.uid()`/RLS para decidir o que apagar (recebe `p_user_id` explícito) —
-- mesmo raciocínio de "administrativo/cross-usuário por natureza" já usado
-- para os jobs de BE-F3-08.
--
-- Execução: supabase db query --linked --file supabase/tests/be_f3_09_delete_account_data.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user  uuid := gen_random_uuid(); -- usuário a ser excluído
  v_other uuid := gen_random_uuid(); -- usuário de controle, NUNCA tocado

  v_acc_u uuid; v_acc_o uuid;
  v_cat_top_u uuid; v_cat_sub_u uuid; v_cat_top_o uuid;
  v_pm_u uuid; v_pm_o uuid;
  v_card_u uuid; v_card_o uuid;
  v_pm_card_u uuid; v_pm_card_o uuid;
  v_invoice_u uuid; v_invoice_o uuid;
  v_tpl_u uuid; v_tpl_o uuid;
  v_ip_u uuid; v_ip_o uuid;
  v_bill_u uuid; v_bill_o uuid;
  v_goal_u uuid; v_goal_o uuid;
  v_batch_u uuid; v_batch_o uuid;
  v_txn_u uuid; v_txn_o uuid;
  v_result jsonb;

  v_remaining_count int;
  v_other_count     int;
BEGIN
  -- ===================== Fixtures de identidade =====================

  INSERT INTO public.allowed_signup_emails (email, note) VALUES
    ('test-f309-user@example.com', 'BE-F3-09 — usuário sintético (alvo da exclusão), só dentro desta transação de teste'),
    ('test-f309-other@example.com', 'BE-F3-09 — usuário sintético (controle, nunca deve ser tocado), só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user, 'test-f309-user@example.com');
  INSERT INTO auth.users (id, email) VALUES (v_other, 'test-f309-other@example.com');
  -- handle_new_user() já cria a linha de profiles automaticamente para os 2.

  -- ===================== Fixtures em TODA tabela "ownable" — para os 2 usuários =====================

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user, 'TEST_ACC_F309', 'checking', 'BRL', 10000) RETURNING id INTO v_acc_u;
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_other, 'TEST_ACC_F309_OTHER', 'checking', 'BRL', 10000) RETURNING id INTO v_acc_o;

  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user, 'TEST_CAT_F309_TOP', 'expense', false) RETURNING id INTO v_cat_top_u;
  INSERT INTO public.categories (user_id, parent_category_id, name, kind, is_system_default)
  VALUES (v_user, v_cat_top_u, 'TEST_CAT_F309_SUB', 'expense', false) RETURNING id INTO v_cat_sub_u;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_other, 'TEST_CAT_F309_OTHER', 'expense', false) RETURNING id INTO v_cat_top_o;

  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user, v_acc_u, 'pix', 'TEST_PM_F309') RETURNING id INTO v_pm_u;
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_other, v_acc_o, 'pix', 'TEST_PM_F309_OTHER') RETURNING id INTO v_pm_o;

  INSERT INTO public.credit_cards (user_id, name, limit_cents, closing_day, due_day)
  VALUES (v_user, 'TEST_CARD_F309', 500000, 10, 20) RETURNING id INTO v_card_u;
  INSERT INTO public.credit_cards (user_id, name, limit_cents, closing_day, due_day)
  VALUES (v_other, 'TEST_CARD_F309_OTHER', 500000, 10, 20) RETURNING id INTO v_card_o;
  SELECT id INTO v_pm_card_u FROM public.payment_methods WHERE credit_card_id = v_card_u AND type = 'credit_card';
  SELECT id INTO v_pm_card_o FROM public.payment_methods WHERE credit_card_id = v_card_o AND type = 'credit_card';

  INSERT INTO public.invoices (credit_card_id, user_id, competencia)
  VALUES (v_card_u, v_user, date_trunc('month', current_date)::date) RETURNING id INTO v_invoice_u;
  INSERT INTO public.invoices (credit_card_id, user_id, competencia)
  VALUES (v_card_o, v_other, date_trunc('month', current_date)::date) RETURNING id INTO v_invoice_o;

  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date, card_invoice_id)
  VALUES (v_user, v_acc_u, v_pm_card_u, v_cat_top_u, 'expense', 700, current_date, v_invoice_u)
  RETURNING id INTO v_txn_u;
  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date, card_invoice_id)
  VALUES (v_other, v_acc_o, v_pm_card_o, v_cat_top_o, 'expense', 700, current_date, v_invoice_o)
  RETURNING id INTO v_txn_o;

  INSERT INTO public.recurring_templates
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, day_of_month, start_date)
  VALUES (v_user, 'TEST_TPL_F309', 15000, v_cat_top_u, v_acc_u, v_pm_u, 5, date_trunc('month', current_date)::date)
  RETURNING id INTO v_tpl_u;
  INSERT INTO public.recurring_templates
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, day_of_month, start_date)
  VALUES (v_other, 'TEST_TPL_F309_OTHER', 15000, v_cat_top_o, v_acc_o, v_pm_o, 5, date_trunc('month', current_date)::date)
  RETURNING id INTO v_tpl_o;

  INSERT INTO public.recurring_template_adjustments (recurring_template_id, user_id, effective_from, amount_cents)
  VALUES (v_tpl_u, v_user, date_trunc('month', current_date + interval '1 month')::date, 16000);
  INSERT INTO public.recurring_template_adjustments (recurring_template_id, user_id, effective_from, amount_cents)
  VALUES (v_tpl_o, v_other, date_trunc('month', current_date + interval '1 month')::date, 16000);

  INSERT INTO public.installment_purchases
    (user_id, description, total_amount_cents, installments_count, category_id, account_id, payment_method_id, purchase_date)
  VALUES (v_user, 'TEST_IP_F309', 6000, 3, v_cat_top_u, v_acc_u, v_pm_card_u, current_date)
  RETURNING id INTO v_ip_u;
  INSERT INTO public.installment_purchases
    (user_id, description, total_amount_cents, installments_count, category_id, account_id, payment_method_id, purchase_date)
  VALUES (v_other, 'TEST_IP_F309_OTHER', 6000, 3, v_cat_top_o, v_acc_o, v_pm_card_o, current_date)
  RETURNING id INTO v_ip_o;

  INSERT INTO public.fixed_bills
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, due_day, start_date)
  VALUES (v_user, 'TEST_BILL_F309', 45000, v_cat_top_u, v_acc_u, v_pm_u, 15, date_trunc('month', current_date)::date)
  RETURNING id INTO v_bill_u;
  INSERT INTO public.fixed_bills
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, due_day, start_date)
  VALUES (v_other, 'TEST_BILL_F309_OTHER', 45000, v_cat_top_o, v_acc_o, v_pm_o, 15, date_trunc('month', current_date)::date)
  RETURNING id INTO v_bill_o;

  INSERT INTO public.budget (user_id, category_id, month, limit_cents, alert_threshold_pct)
  VALUES (v_user, v_cat_top_u, date_trunc('month', current_date)::date, 10000, 80);
  INSERT INTO public.budget (user_id, category_id, month, limit_cents, alert_threshold_pct)
  VALUES (v_other, v_cat_top_o, date_trunc('month', current_date)::date, 10000, 80);

  INSERT INTO public.goals (user_id, name, target_amount_cents)
  VALUES (v_user, 'TEST_GOAL_F309', 100000) RETURNING id INTO v_goal_u;
  INSERT INTO public.goals (user_id, name, target_amount_cents)
  VALUES (v_other, 'TEST_GOAL_F309_OTHER', 100000) RETURNING id INTO v_goal_o;

  INSERT INTO public.contributions (goal_id, user_id, amount_cents)
  VALUES (v_goal_u, v_user, 5000);
  INSERT INTO public.contributions (goal_id, user_id, amount_cents)
  VALUES (v_goal_o, v_other, 5000);

  INSERT INTO public.import_batch (user_id, source, status)
  VALUES (v_user, 'import', 'completed') RETURNING id INTO v_batch_u;
  INSERT INTO public.import_batch (user_id, source, status)
  VALUES (v_other, 'import', 'completed') RETURNING id INTO v_batch_o;

  INSERT INTO public.candidate_transaction (user_id, import_batch_id, source, raw_payload)
  VALUES (v_user, v_batch_u, 'import', '{}'::jsonb);
  INSERT INTO public.candidate_transaction (user_id, import_batch_id, source, raw_payload)
  VALUES (v_other, v_batch_o, 'import', '{}'::jsonb);

  INSERT INTO public.notifications (user_id, type, message)
  VALUES (v_user, 'budget_alert', 'TEST_NOTIF_F309');
  INSERT INTO public.notifications (user_id, type, message)
  VALUES (v_other, 'budget_alert', 'TEST_NOTIF_F309_OTHER');

  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth_key)
  VALUES (v_user, 'https://push.example.com/TEST_F309', 'p256dh_f309', 'auth_f309');
  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth_key)
  VALUES (v_other, 'https://push.example.com/TEST_F309_OTHER', 'p256dh_f309_o', 'auth_f309_o');

  INSERT INTO public.webauthn_credentials (user_id, credential_id, public_key, sign_count)
  VALUES (v_user, 'TEST_CRED_F309', decode('00112233', 'hex'), 0);
  INSERT INTO public.webauthn_credentials (user_id, credential_id, public_key, sign_count)
  VALUES (v_other, 'TEST_CRED_F309_OTHER', decode('00112233', 'hex'), 0);

  INSERT INTO public.webauthn_challenges (user_id, challenge, ceremony_type, expires_at)
  VALUES (v_user, 'TEST_CHALLENGE_F309', 'registration', now() + interval '5 minutes');
  INSERT INTO public.webauthn_challenges (user_id, challenge, ceremony_type, expires_at)
  VALUES (v_other, 'TEST_CHALLENGE_F309_OTHER', 'registration', now() + interval '5 minutes');

  INSERT INTO public.email_mfa_challenges (user_id, session_id, code_hash, expires_at)
  VALUES (v_user, gen_random_uuid(), 'TEST_HASH_F309', now() + interval '10 minutes');
  INSERT INTO public.email_mfa_challenges (user_id, session_id, code_hash, expires_at)
  VALUES (v_other, gen_random_uuid(), 'TEST_HASH_F309_OTHER', now() + interval '10 minutes');

  RAISE NOTICE 'Fixtures (19 tabelas "ownable" + profiles, 2 usuários): OK';

  -- =============================================================================
  -- CASO 1 — delete_user_data(v_user) roda sem lançar exceção (prova, na
  -- prática contra Postgres real, que a ORDEM de exclusão respeita todo
  -- FK RESTRICT/trigger RN-08/RN-09 documentado no cabeçalho da migration —
  -- se a ordem estivesse errada, esta chamada lançaria e o teste falharia
  -- aqui, não silenciosamente).
  -- =============================================================================

  v_result := public.delete_user_data(v_user);
  RAISE NOTICE 'CASO 1 (delete_user_data roda sem exceção, ordem de FK/trigger respeitada): OK — detail=%', v_result;

  -- =============================================================================
  -- CASO 2 — NENHUMA linha de v_user sobra em NENHUMA das 20 tabelas cobertas.
  -- =============================================================================

  SELECT
    (SELECT count(*) FROM public.contributions WHERE user_id = v_user) +
    (SELECT count(*) FROM public.candidate_transaction WHERE user_id = v_user) +
    (SELECT count(*) FROM public.transactions WHERE user_id = v_user) +
    (SELECT count(*) FROM public.fixed_bills WHERE user_id = v_user) +
    (SELECT count(*) FROM public.installment_purchases WHERE user_id = v_user) +
    (SELECT count(*) FROM public.recurring_template_adjustments WHERE user_id = v_user) +
    (SELECT count(*) FROM public.recurring_templates WHERE user_id = v_user) +
    (SELECT count(*) FROM public.invoices WHERE user_id = v_user) +
    (SELECT count(*) FROM public.credit_cards WHERE user_id = v_user) +
    (SELECT count(*) FROM public.import_batch WHERE user_id = v_user) +
    (SELECT count(*) FROM public.budget WHERE user_id = v_user) +
    (SELECT count(*) FROM public.goals WHERE user_id = v_user) +
    (SELECT count(*) FROM public.accounts WHERE user_id = v_user) +
    (SELECT count(*) FROM public.payment_methods WHERE user_id = v_user) +
    (SELECT count(*) FROM public.categories WHERE user_id = v_user) +
    (SELECT count(*) FROM public.notifications WHERE user_id = v_user) +
    (SELECT count(*) FROM public.push_subscriptions WHERE user_id = v_user) +
    (SELECT count(*) FROM public.webauthn_credentials WHERE user_id = v_user) +
    (SELECT count(*) FROM public.webauthn_challenges WHERE user_id = v_user) +
    (SELECT count(*) FROM public.email_mfa_challenges WHERE user_id = v_user) +
    (SELECT count(*) FROM public.profiles WHERE id = v_user)
  INTO v_remaining_count;

  IF v_remaining_count <> 0 THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: sobrou % linha(s) de v_user espalhadas pelas tabelas cobertas (esperado 0)', v_remaining_count;
  END IF;

  RAISE NOTICE 'CASO 2 (0 linhas restantes de v_user em todas as 20 tabelas cobertas + profiles): OK';

  -- =============================================================================
  -- CASO 3 — isolamento: TODA linha de v_other (usuário de controle)
  -- permanece intacta, mesma contagem de antes (1 linha em cada tabela,
  -- 2 em categories por causa da subcategoria só existir para v_user).
  -- =============================================================================

  SELECT
    (SELECT count(*) FROM public.contributions WHERE user_id = v_other) +
    (SELECT count(*) FROM public.candidate_transaction WHERE user_id = v_other) +
    (SELECT count(*) FROM public.transactions WHERE user_id = v_other) +
    (SELECT count(*) FROM public.fixed_bills WHERE user_id = v_other) +
    (SELECT count(*) FROM public.installment_purchases WHERE user_id = v_other) +
    (SELECT count(*) FROM public.recurring_template_adjustments WHERE user_id = v_other) +
    (SELECT count(*) FROM public.recurring_templates WHERE user_id = v_other) +
    (SELECT count(*) FROM public.invoices WHERE user_id = v_other) +
    (SELECT count(*) FROM public.credit_cards WHERE user_id = v_other) +
    (SELECT count(*) FROM public.import_batch WHERE user_id = v_other) +
    (SELECT count(*) FROM public.budget WHERE user_id = v_other) +
    (SELECT count(*) FROM public.goals WHERE user_id = v_other) +
    (SELECT count(*) FROM public.accounts WHERE user_id = v_other) +
    (SELECT count(*) FROM public.payment_methods WHERE user_id = v_other) +
    (SELECT count(*) FROM public.categories WHERE user_id = v_other) +
    (SELECT count(*) FROM public.notifications WHERE user_id = v_other) +
    (SELECT count(*) FROM public.push_subscriptions WHERE user_id = v_other) +
    (SELECT count(*) FROM public.webauthn_credentials WHERE user_id = v_other) +
    (SELECT count(*) FROM public.webauthn_challenges WHERE user_id = v_other) +
    (SELECT count(*) FROM public.email_mfa_challenges WHERE user_id = v_other) +
    (SELECT count(*) FROM public.profiles WHERE id = v_other)
  INTO v_other_count;

  IF v_other_count <> 20 THEN
    RAISE EXCEPTION 'CASO 3 FALHOU (isolamento): esperado 20 linhas de v_other (1 por tabela + profiles), encontrado % — delete_user_data vazou para outro usuário', v_other_count;
  END IF;

  RAISE NOTICE 'CASO 3 (isolamento — nenhuma linha de v_other tocada): OK';

  -- =============================================================================
  -- CASO 4 — idempotência: rodar de novo sobre um usuário já sem dado
  -- nenhum não lança exceção e não afeta v_other.
  -- =============================================================================

  v_result := public.delete_user_data(v_user);
  RAISE NOTICE 'CASO 4 (segunda chamada sobre usuário já vazio, idempotente, sem exceção): OK — detail=%', v_result;

  -- =============================================================================
  -- CASO 5 — p_user_id nulo é rejeitado explicitamente (nunca varre a tabela
  -- inteira por acidente com user_id IS NULL correspondendo a categoria de
  -- sistema, que teria user_id NULL).
  -- =============================================================================

  BEGIN
    PERFORM public.delete_user_data(NULL);
    RAISE EXCEPTION 'CASO 5 FALHOU: delete_user_data(NULL) deveria lançar exceção';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%p_user_id não pode ser nulo%' THEN
      RAISE;
    END IF;
  END;

  RAISE NOTICE 'CASO 5 (p_user_id NULL rejeitado explicitamente): OK';

  RAISE NOTICE 'BE-F3-09 (delete_user_data): TODOS OS 5 CASOS PASSARAM';
END;
$test$;

SELECT 'BE-F3-09 delete_user_data: PASS' AS result;

ROLLBACK;
