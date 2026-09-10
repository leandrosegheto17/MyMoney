-- BE-F3-07 — RPC get_report_export_rows (RF-F3-06 AC1).
--
-- Prova, via RLS real (SET LOCAL ROLE authenticated + request.jwt.claims):
--   (A) lançamento income/expense com categoria de topo retorna
--       account_name/payment_method_name/category_name corretos e
--       subcategory_name NULL;
--   (B) lançamento com subcategoria (categoria com parent_category_id)
--       retorna category_name = nome da categoria-PAI e subcategory_name =
--       nome da própria categoria (AC1 literal — categoria e subcategoria
--       nunca invertidas);
--   (C) lançamento kind=transfer é incluído no resultado (payment_method_
--       name/category_name/subcategory_name NULL, mesmo princípio de
--       transactions_non_transfer_requires_method_and_category) — extrato
--       completo do período, diferente do comparativo de
--       get_income_expense_report;
--   (D) filtro de período (p_start_date/p_end_date) exclui lançamento fora
--       da janela;
--   (E) isolamento cross-user — lançamento de outro usuário nunca aparece;
--   (F) período sem nenhum lançamento retorna lista vazia, nunca erro.
--
-- Execução: supabase db query --linked --file supabase/tests/be_f3_07_report_export.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_a         uuid;
  v_user_b         uuid := gen_random_uuid();
  v_acc_a          uuid;
  v_acc_a2         uuid;
  v_acc_b          uuid;
  v_cat_top        uuid;
  v_cat_sub        uuid;
  v_cat_b          uuid;
  v_pm_a           uuid;
  v_pm_b           uuid;
  v_today          date := current_date;
  v_out_of_window  date := current_date - interval '90 days';
  v_row            record;
  v_row_count      integer;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-b-f307@example.com', 'BE-F3-07 — usuário B fixture, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'test-b-f307@example.com');

  -- Fixture de B (como postgres) — só para o caso de isolamento (E).
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_b, 'TEST_ACC_F307_B', 'checking', 'BRL', 5000) RETURNING id INTO v_acc_b;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_b, 'TEST_CAT_F307_B', 'expense', false) RETURNING id INTO v_cat_b;
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_b, v_acc_b, 'pix', 'TEST_PM_F307_B') RETURNING id INTO v_pm_b;
  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date, description)
  VALUES
    (v_user_b, v_acc_b, v_pm_b, v_cat_b, 'expense', 1234, v_today, 'TEST_DESC_F307_B');

  -- ===================== Assume identidade de A (RLS real) =====================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_F307_A', 'checking', 'BRL', 100000) RETURNING id INTO v_acc_a;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_F307_TOP', 'expense', false) RETURNING id INTO v_cat_top;
  INSERT INTO public.categories (user_id, name, kind, parent_category_id, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_F307_SUB', 'expense', v_cat_top, false) RETURNING id INTO v_cat_sub;
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_a, v_acc_a, 'pix', 'TEST_PM_F307_A') RETURNING id INTO v_pm_a;

  -- ===================== CASO F — período vazio antes de qualquer INSERT =====================

  SELECT count(*) INTO v_row_count
  FROM public.get_report_export_rows((v_today - 1), (v_today - 1));
  IF v_row_count <> 0 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO F FALHOU: período sem lançamento deveria retornar lista vazia, obtido % linha(s)', v_row_count;
  END IF;

  -- ===================== CASO A — categoria de topo, sem subcategoria =====================

  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date, description)
  VALUES
    (v_user_a, v_acc_a, v_pm_a, v_cat_top, 'expense', 4500, v_today, 'TEST_DESC_F307_TOP');

  SELECT * INTO v_row
  FROM public.get_report_export_rows(v_today, v_today)
  WHERE description = 'TEST_DESC_F307_TOP';

  IF v_row.account_name <> 'TEST_ACC_F307_A' THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A1 FALHOU: account_name esperado TEST_ACC_F307_A, obtido %', v_row.account_name;
  END IF;
  IF v_row.payment_method_name <> 'TEST_PM_F307_A' THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A2 FALHOU: payment_method_name esperado TEST_PM_F307_A, obtido %', v_row.payment_method_name;
  END IF;
  IF v_row.category_name <> 'TEST_CAT_F307_TOP' THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A3 FALHOU: category_name esperado TEST_CAT_F307_TOP, obtido %', v_row.category_name;
  END IF;
  IF v_row.subcategory_name IS NOT NULL THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A4 FALHOU: subcategory_name deveria ser NULL para categoria de topo, obtido %', v_row.subcategory_name;
  END IF;
  IF v_row.kind <> 'expense' OR v_row.amount_cents <> 4500 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A5 FALHOU: kind/amount_cents inesperados (% / %)', v_row.kind, v_row.amount_cents;
  END IF;

  -- ===================== CASO B — subcategoria (AC1: categoria e subcategoria nunca invertidas) =====================

  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date, description)
  VALUES
    (v_user_a, v_acc_a, v_pm_a, v_cat_sub, 'expense', 900, v_today, 'TEST_DESC_F307_SUB');

  SELECT * INTO v_row
  FROM public.get_report_export_rows(v_today, v_today)
  WHERE description = 'TEST_DESC_F307_SUB';

  IF v_row.category_name <> 'TEST_CAT_F307_TOP' THEN
    RESET ROLE; RAISE EXCEPTION 'CASO B1 FALHOU: category_name esperado a categoria-PAI TEST_CAT_F307_TOP, obtido %', v_row.category_name;
  END IF;
  IF v_row.subcategory_name <> 'TEST_CAT_F307_SUB' THEN
    RESET ROLE; RAISE EXCEPTION 'CASO B2 FALHOU: subcategory_name esperado TEST_CAT_F307_SUB, obtido %', v_row.subcategory_name;
  END IF;

  -- ===================== CASO C — transfer é incluído no extrato completo =====================

  -- transactions_transfer_destination_check exige destination_account_id <>
  -- account_id — usa uma 2ª conta só para satisfazer a constraint.
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_F307_A2', 'checking', 'BRL', 0) RETURNING id INTO v_acc_a2;

  INSERT INTO public.transactions
    (user_id, account_id, destination_account_id, kind, amount_cents, transaction_date, description)
  VALUES
    (v_user_a, v_acc_a, v_acc_a2, 'transfer', 500, v_today, 'TEST_DESC_F307_TRANSFER');

  SELECT * INTO v_row
  FROM public.get_report_export_rows(v_today, v_today)
  WHERE description = 'TEST_DESC_F307_TRANSFER';

  IF v_row.kind IS NULL OR v_row.kind <> 'transfer' THEN
    RESET ROLE; RAISE EXCEPTION 'CASO C1 FALHOU: transfer deveria aparecer no extrato completo do período, kind obtido %', v_row.kind;
  END IF;
  IF v_row.category_name IS NOT NULL OR v_row.payment_method_name IS NOT NULL THEN
    RESET ROLE; RAISE EXCEPTION 'CASO C2 FALHOU: transfer não usa payment_method_id/category_id, deveriam vir NULL';
  END IF;

  -- ===================== CASO D — filtro de período exclui lançamento fora da janela =====================

  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date, description)
  VALUES
    (v_user_a, v_acc_a, v_pm_a, v_cat_top, 'expense', 111, v_out_of_window, 'TEST_DESC_F307_OUT_OF_WINDOW');

  PERFORM 1 FROM public.get_report_export_rows(v_today, v_today)
  WHERE description = 'TEST_DESC_F307_OUT_OF_WINDOW';
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO D FALHOU: lançamento fora do período [p_start_date, p_end_date] não deveria aparecer';
  END IF;

  PERFORM 1 FROM public.get_report_export_rows(v_out_of_window, v_out_of_window)
  WHERE description = 'TEST_DESC_F307_OUT_OF_WINDOW';
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO D FALHOU: lançamento deveria aparecer quando o período o inclui';
  END IF;

  -- ===================== CASO E — isolamento cross-user =====================

  PERFORM 1 FROM public.get_report_export_rows((v_today - 365), v_today)
  WHERE description = 'TEST_DESC_F307_B';
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO E FALHOU: lançamento de outro usuário nunca deveria aparecer (isolamento cross-user)';
  END IF;

  RESET ROLE;

  RAISE NOTICE 'BE-F3-07 (categoria/subcategoria, transfer incluído, filtro de período, isolamento cross-user, período vazio): TODOS PASSARAM';
END;
$test$;

SELECT 'BE-F3-07 get_report_export_rows: PASS' AS result;

ROLLBACK;
