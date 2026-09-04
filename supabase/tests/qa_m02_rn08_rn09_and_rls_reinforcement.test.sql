-- QA-M-02 — Casos de teste automatizados para RN-08 (inativação vs. exclusão de
-- conta), RN-09 (bloqueio de exclusão de categoria vinculada) e reforço de RLS
-- ownership (BE-M-11) sobre as tabelas "ownable" de Fase 2 que não existiam
-- quando `be_m11_rls_cross_user.test.sql` foi escrito (credit_cards, invoices,
-- recurring_templates, recurring_template_adjustments, installment_purchases,
-- fixed_bills, goals, contributions, notifications).
--
-- Padrão idêntico aos testes já existentes: `SET LOCAL ROLE authenticated` +
-- `request.jwt.claims` simulado pra exercitar RLS de verdade.
--
-- Execução: supabase db query --linked --file supabase/tests/qa_m02_rn08_rn09_and_rls_reinforcement.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_a   uuid;
  v_user_b   uuid := gen_random_uuid(); -- nunca existe em auth.users, de propósito
  v_blocked  boolean;
  -- fixtures gerais (usuário A, reutilizáveis)
  v_acc      uuid;
  v_pm       uuid;
  v_cat      uuid;
  -- RN-08
  v_acc2     uuid;
  v_pm2      uuid;
  v_txn2     uuid;
  -- RN-09
  v_cat2     uuid;
  v_txn3     uuid;
  v_cat3     uuid;
  v_budget2  uuid;
  v_cat4     uuid;
  -- reforço RLS (tabelas de Fase 2)
  v_cc       uuid;
  v_pm_cc    uuid;
  v_inv      uuid;
  v_rt       uuid;
  v_rta      uuid;
  v_ip       uuid;
  v_fb       uuid;
  v_goal     uuid;
  v_contrib  uuid;
  v_notif    uuid;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_QA02', 'checking', 'BRL', 1000)
  RETURNING id INTO v_acc;
  -- O trigger de seed de formas de pagamento padrão só roda na 1ª conta que o
  -- usuário jamais cria (`accounts_seed_default_payment_methods`: "if not
  -- exists... is_system_default = true"); contas seguintes não ganham novas
  -- linhas em `payment_methods` escopadas ao próprio `account_id`. Mesmo
  -- padrão já usado em `be_m06_transactions.test.sql`/`be_m11_...`: busca por
  -- `user_id`, não por `account_id`.
  SELECT id INTO v_pm FROM public.payment_methods WHERE user_id = v_user_a AND is_system_default AND type = 'pix' LIMIT 1;
  SELECT id INTO v_cat FROM public.categories WHERE name = 'Moradia' LIMIT 1;

  -- ===================== RN-08: conta com lançamento vinculado =====================

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_QA02_RN08', 'checking', 'BRL', 1000)
  RETURNING id INTO v_acc2;
  v_pm2 := v_pm;

  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_a, v_acc2, v_pm2, v_cat, 'expense', 100, current_date)
  RETURNING id INTO v_txn2;

  -- CASO 1: DELETE físico é bloqueado, com a mensagem específica de RN-08.
  v_blocked := false;
  BEGIN
    DELETE FROM public.accounts WHERE id = v_acc2;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
    IF SQLERRM NOT LIKE '%RN-08%' THEN
      RAISE EXCEPTION 'CASO 1 FALHOU (RN-08): DELETE foi bloqueado, mas com mensagem inesperada: %', SQLERRM;
    END IF;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CASO 1 FALHOU (RN-08): conta com lançamento vinculado deveria ter DELETE físico bloqueado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = v_acc2) THEN
    RAISE EXCEPTION 'CASO 1 FALHOU (RN-08): conta foi removida apesar do bloqueio esperado';
  END IF;

  -- CASO 2: inativação (is_active = false) é o caminho correto, permitido.
  UPDATE public.accounts SET is_active = false WHERE id = v_acc2;
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = v_acc2 AND is_active = false) THEN
    RAISE EXCEPTION 'CASO 2 FALHOU (RN-08): inativação deveria ter sido permitida como alternativa ao DELETE';
  END IF;

  -- ===================== RN-09: categoria vinculada =====================

  -- CASO 3: categoria com lançamento vinculado — DELETE bloqueado.
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_QA02_RN09_TXN', 'expense', false)
  RETURNING id INTO v_cat2;

  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_a, v_acc, v_pm, v_cat2, 'expense', 50, current_date)
  RETURNING id INTO v_txn3;

  v_blocked := false;
  BEGIN
    DELETE FROM public.categories WHERE id = v_cat2;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
    IF SQLERRM NOT LIKE '%RN-09%' THEN
      RAISE EXCEPTION 'CASO 3 FALHOU (RN-09): DELETE foi bloqueado, mas com mensagem inesperada: %', SQLERRM;
    END IF;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CASO 3 FALHOU (RN-09): categoria com lançamento vinculado deveria ter DELETE físico bloqueado';
  END IF;

  -- CASO 4: categoria só com orçamento vinculado (sem lançamento) — DELETE também bloqueado.
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_QA02_RN09_BUDGET', 'expense', false)
  RETURNING id INTO v_cat3;

  INSERT INTO public.budget (user_id, category_id, month, limit_cents)
  VALUES (v_user_a, v_cat3, date_trunc('month', current_date)::date, 5000)
  RETURNING id INTO v_budget2;

  v_blocked := false;
  BEGIN
    DELETE FROM public.categories WHERE id = v_cat3;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
    IF SQLERRM NOT LIKE '%RN-09%' THEN
      RAISE EXCEPTION 'CASO 4 FALHOU (RN-09): DELETE foi bloqueado, mas com mensagem inesperada: %', SQLERRM;
    END IF;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CASO 4 FALHOU (RN-09): categoria com orçamento vinculado deveria ter DELETE físico bloqueado';
  END IF;

  -- CASO 5 (sanity, controle negativo): categoria sem nenhum vínculo pode ser excluída normalmente.
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_QA02_SEM_VINCULO', 'expense', false)
  RETURNING id INTO v_cat4;

  DELETE FROM public.categories WHERE id = v_cat4;
  IF EXISTS (SELECT 1 FROM public.categories WHERE id = v_cat4) THEN
    RAISE EXCEPTION 'CASO 5 FALHOU: categoria sem vínculo deveria ter sido excluída (controle negativo de RN-09)';
  END IF;

  RAISE NOTICE 'QA-M-02 (RN-08/RN-09): TODOS OS 5 CASOS PASSARAM';

  -- ===================== Reforço RLS: tabelas de Fase 2 (fixtures de A) =====================

  INSERT INTO public.credit_cards (user_id, name, limit_cents, closing_day, due_day)
  VALUES (v_user_a, 'TEST_CC_QA02', 100000, 10, 20)
  RETURNING id INTO v_cc;
  -- Trigger de BE-F2-01 gera automaticamente a forma de pagamento "crédito"
  -- associada ao cartão — RF-F2-04 exige exatamente esse type para InstallmentPurchase.
  SELECT id INTO v_pm_cc FROM public.payment_methods WHERE credit_card_id = v_cc AND type = 'credit_card' LIMIT 1;

  INSERT INTO public.invoices (credit_card_id, user_id, competencia)
  VALUES (v_cc, v_user_a, date_trunc('month', current_date)::date)
  RETURNING id INTO v_inv;

  INSERT INTO public.recurring_templates
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, day_of_month, start_date)
  VALUES (v_user_a, 'TEST_RT_QA02', 1000, v_cat, v_acc, v_pm, 5, current_date)
  RETURNING id INTO v_rt;

  INSERT INTO public.recurring_template_adjustments
    (recurring_template_id, user_id, effective_from, amount_cents)
  VALUES (v_rt, v_user_a, date_trunc('month', current_date + interval '1 month')::date, 1500)
  RETURNING id INTO v_rta;

  INSERT INTO public.installment_purchases
    (user_id, description, total_amount_cents, installments_count, category_id, account_id, payment_method_id, purchase_date)
  VALUES (v_user_a, 'TEST_IP_QA02', 2000, 2, v_cat, v_acc, v_pm_cc, current_date)
  RETURNING id INTO v_ip;

  INSERT INTO public.fixed_bills
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, due_day, start_date)
  VALUES (v_user_a, 'TEST_FB_QA02', 3000, v_cat, v_acc, v_pm, 10, current_date)
  RETURNING id INTO v_fb;

  INSERT INTO public.goals (user_id, name, target_amount_cents)
  VALUES (v_user_a, 'TEST_GOAL_QA02', 500000)
  RETURNING id INTO v_goal;

  INSERT INTO public.contributions (goal_id, user_id, amount_cents)
  VALUES (v_goal, v_user_a, 10000)
  RETURNING id INTO v_contrib;

  INSERT INTO public.notifications (user_id, type, message)
  VALUES (v_user_a, 'budget_alert', 'TEST_NOTIF_QA02')
  RETURNING id INTO v_notif;

  -- ===================== Assume identidade de B (RLS real) =====================

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_b::text, 'app_email_mfa_verified', 'true')::text,
    true);

  -- CASO 6 (credit_cards): SELECT/UPDATE/DELETE.
  PERFORM 1 FROM public.credit_cards WHERE id = v_cc;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 6 FALHOU (credit_cards): B conseguiu SELECT no cartão de A'; END IF;
  UPDATE public.credit_cards SET name = 'HACKED_BY_B' WHERE id = v_cc;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 6 FALHOU (credit_cards): B conseguiu UPDATE no cartão de A'; END IF;
  DELETE FROM public.credit_cards WHERE id = v_cc;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 6 FALHOU (credit_cards): B conseguiu DELETE no cartão de A'; END IF;

  -- CASO 7 (invoices): só SELECT/INSERT são concedidos a `authenticated` (sem UPDATE/DELETE, ver comment da tabela).
  PERFORM 1 FROM public.invoices WHERE id = v_inv;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 7 FALHOU (invoices): B conseguiu SELECT na fatura de A'; END IF;

  -- CASO 8 (recurring_templates): SELECT/UPDATE/DELETE.
  PERFORM 1 FROM public.recurring_templates WHERE id = v_rt;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 8 FALHOU (recurring_templates): B conseguiu SELECT no template de A'; END IF;
  UPDATE public.recurring_templates SET description = 'HACKED_BY_B' WHERE id = v_rt;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 8 FALHOU (recurring_templates): B conseguiu UPDATE no template de A'; END IF;
  DELETE FROM public.recurring_templates WHERE id = v_rt;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 8 FALHOU (recurring_templates): B conseguiu DELETE no template de A'; END IF;

  -- CASO 9 (recurring_template_adjustments): SELECT/UPDATE/DELETE.
  PERFORM 1 FROM public.recurring_template_adjustments WHERE id = v_rta;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 9 FALHOU (recurring_template_adjustments): B conseguiu SELECT no reajuste de A'; END IF;
  UPDATE public.recurring_template_adjustments SET amount_cents = 1 WHERE id = v_rta;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 9 FALHOU (recurring_template_adjustments): B conseguiu UPDATE no reajuste de A'; END IF;
  DELETE FROM public.recurring_template_adjustments WHERE id = v_rta;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 9 FALHOU (recurring_template_adjustments): B conseguiu DELETE no reajuste de A'; END IF;

  -- CASO 10 (installment_purchases): SELECT/UPDATE/DELETE.
  PERFORM 1 FROM public.installment_purchases WHERE id = v_ip;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 10 FALHOU (installment_purchases): B conseguiu SELECT na compra parcelada de A'; END IF;
  UPDATE public.installment_purchases SET description = 'HACKED_BY_B' WHERE id = v_ip;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 10 FALHOU (installment_purchases): B conseguiu UPDATE na compra parcelada de A'; END IF;
  DELETE FROM public.installment_purchases WHERE id = v_ip;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 10 FALHOU (installment_purchases): B conseguiu DELETE na compra parcelada de A'; END IF;

  -- CASO 11 (fixed_bills): SELECT/UPDATE/DELETE.
  PERFORM 1 FROM public.fixed_bills WHERE id = v_fb;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 11 FALHOU (fixed_bills): B conseguiu SELECT na conta fixa de A'; END IF;
  UPDATE public.fixed_bills SET description = 'HACKED_BY_B' WHERE id = v_fb;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 11 FALHOU (fixed_bills): B conseguiu UPDATE na conta fixa de A'; END IF;
  DELETE FROM public.fixed_bills WHERE id = v_fb;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 11 FALHOU (fixed_bills): B conseguiu DELETE na conta fixa de A'; END IF;

  -- CASO 12 (goals): SELECT/UPDATE/DELETE.
  PERFORM 1 FROM public.goals WHERE id = v_goal;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 12 FALHOU (goals): B conseguiu SELECT na meta de A'; END IF;
  UPDATE public.goals SET name = 'HACKED_BY_B' WHERE id = v_goal;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 12 FALHOU (goals): B conseguiu UPDATE na meta de A'; END IF;
  DELETE FROM public.goals WHERE id = v_goal;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 12 FALHOU (goals): B conseguiu DELETE na meta de A'; END IF;

  -- CASO 13 (contributions): SELECT/UPDATE/DELETE.
  PERFORM 1 FROM public.contributions WHERE id = v_contrib;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 13 FALHOU (contributions): B conseguiu SELECT no aporte de A'; END IF;
  UPDATE public.contributions SET amount_cents = 1 WHERE id = v_contrib;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 13 FALHOU (contributions): B conseguiu UPDATE no aporte de A'; END IF;
  DELETE FROM public.contributions WHERE id = v_contrib;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 13 FALHOU (contributions): B conseguiu DELETE no aporte de A'; END IF;

  -- CASO 14 (notifications): só SELECT/UPDATE são concedidos a `authenticated` (sem INSERT/DELETE — só notify_user()).
  PERFORM 1 FROM public.notifications WHERE id = v_notif;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 14 FALHOU (notifications): B conseguiu SELECT na notificação de A'; END IF;
  UPDATE public.notifications SET read_at = now() WHERE id = v_notif;
  IF FOUND THEN RESET ROLE; RAISE EXCEPTION 'CASO 14 FALHOU (notifications): B conseguiu UPDATE (marcar lida) na notificação de A'; END IF;

  RESET ROLE;

  -- ===================== Confirma que os dados de A continuam intactos =====================

  IF NOT EXISTS (SELECT 1 FROM public.credit_cards WHERE id = v_cc AND name = 'TEST_CC_QA02') THEN
    RAISE EXCEPTION 'RESÍDUO: cartão de A foi alterado/apagado apesar dos blocos acima terem passado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.goals WHERE id = v_goal AND name = 'TEST_GOAL_QA02') THEN
    RAISE EXCEPTION 'RESÍDUO: meta de A foi alterada/apagada apesar dos blocos acima terem passado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE id = v_notif AND read_at IS NULL) THEN
    RAISE EXCEPTION 'RESÍDUO: notificação de A foi marcada como lida apesar do bloco acima ter passado';
  END IF;

  RAISE NOTICE 'QA-M-02 (reforço RLS, 9 tabelas de Fase 2): TODOS OS 9 CASOS PASSARAM';
END;
$test$;

SELECT 'QA-M-02 (RN-08/RN-09 + reforço RLS Fase 2): PASS' AS result;

ROLLBACK;
