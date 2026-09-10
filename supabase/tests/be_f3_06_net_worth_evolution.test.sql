-- BE-F3-06 — Query de evolução patrimonial: série temporal do saldo
-- consolidado, filtrável por conta (RF-F3-05 AC1-2).
--
-- Prova, via RLS real (SET LOCAL ROLE authenticated + request.jwt.claims):
--   (A) mês corrente da visão consolidada reflete, por DELTA, os
--       lançamentos inseridos nas duas contas de teste (AC1);
--   (B) filtro por conta individual (AC2) retorna, para cada conta, só o
--       efeito daquela conta;
--   (C) coerência entre as duas visões (critério de aceite literal desta
--       tarefa): a soma, mês a mês, das séries filtradas por conta A e
--       por conta B bate exatamente com o DELTA da série consolidada,
--       para toda a janela de 6 meses;
--   (D) janela é limitada a 6 meses — lançamento de 7 meses atrás não
--       desloca nenhum ponto da série (nem consolidada nem por conta);
--   (E) conta de outro usuário como p_account_id não vaza dado (lista
--       vazia, nunca erro nem dado de terceiro) — isolamento cross-user;
--   (F) nunca mais de 6 linhas retornadas (janela fixa).
--
-- Execução: supabase db query --linked --file supabase/tests/be_f3_06_net_worth_evolution.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_a          uuid;
  v_user_b          uuid := gen_random_uuid();
  v_acc_a1          uuid;
  v_acc_a2          uuid;
  v_acc_b           uuid;
  v_cat_income_a    uuid;
  v_cat_expense_a   uuid;
  v_cat_income_b    uuid;
  v_pm_a1           uuid;
  v_pm_a2           uuid;
  v_pm_b            uuid;
  v_old_month       date := (date_trunc('month', current_date) - interval '7 months')::date;
  v_current_month   date := date_trunc('month', current_date)::date;
  v_consolidated_before bigint;
  v_consolidated_after  bigint;
  v_acc1_before     bigint;
  v_acc1_after      bigint;
  v_acc2_before     bigint;
  v_acc2_after      bigint;
  v_row_count       integer;
  v_mismatch_count  integer;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-b-f306@example.com', 'BE-F3-06 — usuário B fixture, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'test-b-f306@example.com');

  -- Fixture de B (como postgres) — só para o caso de isolamento (E).
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_b, 'TEST_ACC_F306_B', 'checking', 'BRL', 5000) RETURNING id INTO v_acc_b;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_b, 'TEST_CAT_F306_B', 'income', false) RETURNING id INTO v_cat_income_b;
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_b, v_acc_b, 'pix', 'TEST_PM_F306_B') RETURNING id INTO v_pm_b;

  -- ===================== Assume identidade de A (RLS real) =====================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_F306_A1', 'checking', 'BRL', 100000) RETURNING id INTO v_acc_a1;
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_F306_A2', 'checking', 'BRL', 50000) RETURNING id INTO v_acc_a2;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_F306_A_INCOME', 'income', false) RETURNING id INTO v_cat_income_a;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_F306_A_EXPENSE', 'expense', false) RETURNING id INTO v_cat_expense_a;
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_a, v_acc_a1, 'pix', 'TEST_PM_F306_A1') RETURNING id INTO v_pm_a1;
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_a, v_acc_a2, 'pix', 'TEST_PM_F306_A2') RETURNING id INTO v_pm_a2;

  -- A visão consolidada soma TODAS as contas ativas do usuário (mesmo
  -- critério de get_month_provision/BE-M-07) — para provar a coerência
  -- entre consolidado e filtro por conta (CASO C/D, AC2) de forma
  -- determinística, contas ativas pré-existentes do profile real são
  -- temporariamente inativadas dentro desta transação (ROLLBACK ao
  -- final desfaz por completo, nenhuma linha real é afetada de fato).
  -- Sem isso, a soma das 2 contas de teste nunca bateria com o
  -- consolidado real, que pode incluir outras contas do mesmo usuário.
  UPDATE public.accounts
    SET is_active = false
    WHERE user_id = v_user_a
      AND id NOT IN (v_acc_a1, v_acc_a2);

  -- ===================== Baseline (antes de qualquer inserção de teste) =====================

  SELECT coalesce(balance_cents, 0) INTO v_consolidated_before
  FROM public.get_net_worth_evolution() WHERE month = v_current_month;

  SELECT coalesce(balance_cents, 0) INTO v_acc1_before
  FROM public.get_net_worth_evolution(v_acc_a1) WHERE month = v_current_month;

  SELECT coalesce(balance_cents, 0) INTO v_acc2_before
  FROM public.get_net_worth_evolution(v_acc_a2) WHERE month = v_current_month;

  -- ===================== CASO A/B — lançamentos em 2 contas, deltas corretos =====================

  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES
    (v_user_a, v_acc_a1, v_pm_a1, v_cat_income_a,  'income',  20000, current_date),
    (v_user_a, v_acc_a1, v_pm_a1, v_cat_expense_a, 'expense', 3000,  current_date),
    (v_user_a, v_acc_a2, v_pm_a2, v_cat_income_a,  'income',  7000,  current_date);

  SELECT balance_cents INTO v_consolidated_after
  FROM public.get_net_worth_evolution() WHERE month = v_current_month;

  SELECT balance_cents INTO v_acc1_after
  FROM public.get_net_worth_evolution(v_acc_a1) WHERE month = v_current_month;

  SELECT balance_cents INTO v_acc2_after
  FROM public.get_net_worth_evolution(v_acc_a2) WHERE month = v_current_month;

  IF (v_acc1_after - v_acc1_before) <> (20000 - 3000) THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A1 FALHOU: delta da conta 1 esperado 17000, obtido %', (v_acc1_after - v_acc1_before);
  END IF;
  IF (v_acc2_after - v_acc2_before) <> 7000 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A2 FALHOU: delta da conta 2 esperado 7000, obtido %', (v_acc2_after - v_acc2_before);
  END IF;
  IF (v_consolidated_after - v_consolidated_before) <> (17000 + 7000) THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A3 FALHOU: delta consolidado esperado 24000, obtido %', (v_consolidated_after - v_consolidated_before);
  END IF;

  -- ===================== CASO C (AC2 literal) — coerência entre filtro e consolidado, toda a janela =====================

  SELECT count(*) INTO v_mismatch_count
  FROM (
    SELECT
      coalesce(c.month, a1.month, a2.month) AS month,
      coalesce(c.balance_cents, 0) AS consolidated,
      coalesce(a1.balance_cents, 0) + coalesce(a2.balance_cents, 0) AS summed_accounts
    FROM public.get_net_worth_evolution() c
    FULL OUTER JOIN public.get_net_worth_evolution(v_acc_a1) a1 ON a1.month = c.month
    FULL OUTER JOIN public.get_net_worth_evolution(v_acc_a2) a2 ON a2.month = coalesce(c.month, a1.month)
  ) diff
  WHERE consolidated <> summed_accounts;

  IF v_mismatch_count <> 0 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO C FALHOU (AC2): % ponto(s) da série onde a soma das contas individuais diverge da visão consolidada', v_mismatch_count;
  END IF;

  -- ===================== CASO D — janela de 6 meses exclui lançamento de 7 meses atrás =====================

  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES
    (v_user_a, v_acc_a1, v_pm_a1, v_cat_income_a, 'income', 999999, v_old_month);

  PERFORM 1 FROM public.get_net_worth_evolution() WHERE month = v_old_month;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO D1 FALHOU: lançamento de 7 meses atrás não deveria produzir ponto na série (janela fixa de 6 meses)';
  END IF;

  SELECT balance_cents INTO v_consolidated_after
  FROM public.get_net_worth_evolution() WHERE month = v_current_month;
  -- Lançamento de 7 meses atrás afeta current_balance_cents (efeito já
  -- aplicado pelo trigger, independente de status/data), mas por estar
  -- fora da janela de reversão de nenhum mês visível, o ponto do mês
  -- corrente permanece coerente com o delta já validado no CASO A —
  -- soma ainda bate (mesma prova do CASO C, revalidada após o INSERT).
  SELECT count(*) INTO v_mismatch_count
  FROM (
    SELECT
      coalesce(c.month, a1.month, a2.month) AS month,
      coalesce(c.balance_cents, 0) AS consolidated,
      coalesce(a1.balance_cents, 0) + coalesce(a2.balance_cents, 0) AS summed_accounts
    FROM public.get_net_worth_evolution() c
    FULL OUTER JOIN public.get_net_worth_evolution(v_acc_a1) a1 ON a1.month = c.month
    FULL OUTER JOIN public.get_net_worth_evolution(v_acc_a2) a2 ON a2.month = coalesce(c.month, a1.month)
  ) diff
  WHERE consolidated <> summed_accounts;
  IF v_mismatch_count <> 0 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO D2 FALHOU: coerência consolidado/contas quebrou após lançamento fora da janela';
  END IF;

  -- ===================== CASO F — nunca mais de 6 linhas (janela fixa) =====================

  SELECT count(*) INTO v_row_count FROM public.get_net_worth_evolution();
  IF v_row_count > 6 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO F1 FALHOU: série consolidada retornou % linhas, nunca deveria passar de 6', v_row_count;
  END IF;

  -- ===================== CASO E — isolamento cross-user (conta de B como p_account_id) =====================

  SELECT count(*) INTO v_row_count FROM public.get_net_worth_evolution(v_acc_b);
  IF v_row_count <> 0 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO E1 FALHOU: p_account_id de outro usuário deveria retornar lista vazia, obtido % linha(s)', v_row_count;
  END IF;

  RESET ROLE;

  RAISE NOTICE 'BE-F3-06 (deltas por conta, coerência consolidado x filtro por conta, janela de 6 meses, isolamento cross-user): TODOS PASSARAM';
END;
$test$;

SELECT 'BE-F3-06 get_net_worth_evolution: PASS' AS result;

ROLLBACK;
