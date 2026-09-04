-- BE-F2-10 — Query de relatório comparativo entradas x saídas, últimos 6
-- meses (RF-F2-10 AC1-2).
--
-- Prova, via RLS real (SET LOCAL ROLE authenticated + request.jwt.claims):
--   (A) mês corrente reflete corretamente as entradas/saídas inseridas —
--       comparação por DELTA contra o baseline (o profile real pode já ter
--       dado pré-existente no mês corrente, não é seguro assumir valor
--       absoluto zero);
--   (B) janela é limitada a 6 meses — lançamento de 7 meses atrás NÃO
--       aparece no relatório, mesmo existindo de fato na tabela;
--   (C) nenhuma linha do relatório é "zero fabricado" (AC2) — toda linha
--       retornada tem income_cents > 0 OU expense_cents > 0, por construção
--       (prova estrutural, não depende do estado real da base);
--   (D) nunca mais de 6 linhas retornadas (janela fixa, AC1);
--   (E) isolamento cross-user — lançamento de B não vaza pro relatório de A.
--
-- Execução: supabase db query --linked --file supabase/tests/be_f2_10_income_expense_report.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_a         uuid;
  v_user_b         uuid := gen_random_uuid();
  v_acc_a          uuid;
  v_acc_b          uuid;
  v_cat_income_a   uuid;
  v_cat_expense_a  uuid;
  v_cat_income_b   uuid;
  v_pm_a           uuid;
  v_pm_b           uuid;
  v_old_month      date := (date_trunc('month', current_date) - interval '7 months')::date;
  v_income_before  bigint;
  v_expense_before bigint;
  v_income_after   bigint;
  v_expense_after  bigint;
  v_income_isol    bigint;
  v_expense_isol   bigint;
  v_row_count      integer;
  v_zero_fill      integer;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-b-f210@example.com', 'BE-F2-10 — usuário B fixture, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'test-b-f210@example.com');

  -- Fixture de B (como postgres) — 1 conta/categoria/forma, para o caso de isolamento.
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_b, 'TEST_ACC_F210_B', 'checking', 'BRL', 1000) RETURNING id INTO v_acc_b;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_b, 'TEST_CAT_F210_B', 'income', false) RETURNING id INTO v_cat_income_b;
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_b, v_acc_b, 'pix', 'TEST_PM_F210_B') RETURNING id INTO v_pm_b;

  -- ===================== Assume identidade de A (RLS real) =====================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_F210_A', 'checking', 'BRL', 100000) RETURNING id INTO v_acc_a;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_F210_A_INCOME', 'income', false) RETURNING id INTO v_cat_income_a;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_F210_A_EXPENSE', 'expense', false) RETURNING id INTO v_cat_expense_a;
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_a, v_acc_a, 'pix', 'TEST_PM_F210_A') RETURNING id INTO v_pm_a;

  -- ===================== Baseline (antes de qualquer inserção de teste) =====================

  SELECT coalesce(income_cents, 0), coalesce(expense_cents, 0)
    INTO v_income_before, v_expense_before
  FROM public.get_income_expense_report()
  WHERE month = date_trunc('month', current_date)::date;

  IF v_income_before IS NULL THEN v_income_before := 0; END IF;
  IF v_expense_before IS NULL THEN v_expense_before := 0; END IF;

  -- ===================== CASO A — mês corrente reflete o dado inserido (delta) =====================

  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES
    (v_user_a, v_acc_a, v_pm_a, v_cat_income_a,  'income',  12345, current_date),
    (v_user_a, v_acc_a, v_pm_a, v_cat_expense_a, 'expense', 6789,  current_date);

  SELECT income_cents, expense_cents INTO v_income_after, v_expense_after
  FROM public.get_income_expense_report()
  WHERE month = date_trunc('month', current_date)::date;

  IF v_income_after IS NULL OR v_expense_after IS NULL THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A1 FALHOU: mês corrente deveria aparecer no relatório após inserir lançamento';
  END IF;
  IF (v_income_after - v_income_before) <> 12345 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A2 FALHOU: delta de income_cents do mês corrente esperado 12345, obtido %', (v_income_after - v_income_before);
  END IF;
  IF (v_expense_after - v_expense_before) <> 6789 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A3 FALHOU: delta de expense_cents do mês corrente esperado 6789, obtido %', (v_expense_after - v_expense_before);
  END IF;

  -- ===================== CASO B — janela de 6 meses exclui lançamento de 7 meses atrás =====================

  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES
    (v_user_a, v_acc_a, v_pm_a, v_cat_income_a, 'income', 999999, v_old_month);

  PERFORM 1 FROM public.get_income_expense_report() WHERE month = v_old_month;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO B1 FALHOU: lançamento de 7 meses atrás não deveria aparecer no relatório (janela fixa de 6 meses, AC1)';
  END IF;

  -- ===================== CASO C — nenhuma linha "zero fabricado" (AC2) =====================

  SELECT count(*) INTO v_zero_fill
  FROM public.get_income_expense_report()
  WHERE income_cents = 0 AND expense_cents = 0;
  IF v_zero_fill <> 0 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO C1 FALHOU (AC2): relatório trouxe % linha(s) com income_cents=0 E expense_cents=0 — mês sem dado nunca deveria aparecer', v_zero_fill;
  END IF;

  -- ===================== CASO D — nunca mais de 6 linhas (janela fixa) =====================

  SELECT count(*) INTO v_row_count FROM public.get_income_expense_report();
  IF v_row_count > 6 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO D1 FALHOU: relatório retornou % linhas, nunca deveria passar de 6 (AC1)', v_row_count;
  END IF;

  -- ===================== CASO E — isolamento cross-user =====================

  RESET ROLE;

  -- B lança uma entrada grande no mês corrente, com valor bem distinto (777777).
  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES
    (v_user_b, v_acc_b, v_pm_b, v_cat_income_b, 'income', 777777, current_date);

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  SELECT income_cents, expense_cents INTO v_income_isol, v_expense_isol
  FROM public.get_income_expense_report()
  WHERE month = date_trunc('month', current_date)::date;

  IF v_income_isol <> v_income_after OR v_expense_isol <> v_expense_after THEN
    RESET ROLE; RAISE EXCEPTION 'CASO E1 FALHOU: lançamento de B (777777) vazou pro relatório de A — esperado income_cents=%, obtido %', v_income_after, v_income_isol;
  END IF;

  RESET ROLE;

  RAISE NOTICE 'BE-F2-10 (mês corrente por delta, janela de 6 meses, sem zero fabricado, isolamento cross-user): TODOS PASSARAM';
END;
$test$;

SELECT 'BE-F2-10 get_income_expense_report: PASS' AS result;

ROLLBACK;
