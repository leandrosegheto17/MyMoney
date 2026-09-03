-- BE-M-01 — Teste de: (1) tabela `budget` existe e aceita/valida corretamente;
-- (2) RN-08 bloqueia DELETE de `accounts` com lançamento vinculado; (3) RN-09
-- bloqueia DELETE de `categories` com lançamento OU orçamento vinculado.
--
-- Execução: supabase db query --linked --file supabase/tests/be_m01_budget_and_guards.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_id      uuid;
  v_acc          uuid;
  v_cat          uuid;
  v_cat_no_link  uuid;
  v_pm           uuid;
  v_budget_id    uuid;
  v_blocked      boolean;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  -- CASO 1: budget aceita um teto válido para uma categoria existente.
  SELECT id INTO v_cat FROM public.categories WHERE name = 'Lazer' LIMIT 1;
  IF v_cat IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: categoria Lazer não encontrada';
  END IF;

  INSERT INTO public.budget (user_id, category_id, month, limit_cents, alert_threshold_pct)
  VALUES (v_user_id, v_cat, date_trunc('month', current_date)::date, 50000, 80)
  RETURNING id INTO v_budget_id;

  IF v_budget_id IS NULL THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: budget não foi inserido';
  END IF;

  -- CASO 2: budget rejeita limit_cents <= 0.
  v_blocked := false;
  BEGIN
    INSERT INTO public.budget (user_id, category_id, month, limit_cents)
    VALUES (v_user_id, v_cat, date_trunc('month', current_date + interval '1 month')::date, 0);
  EXCEPTION WHEN check_violation THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: budget com limit_cents=0 deveria ser rejeitado';
  END IF;

  -- CASO 3: budget rejeita duplicata (mesmo user+categoria+mês).
  v_blocked := false;
  BEGIN
    INSERT INTO public.budget (user_id, category_id, month, limit_cents)
    VALUES (v_user_id, v_cat, date_trunc('month', current_date)::date, 1000);
  EXCEPTION WHEN unique_violation THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CASO 3 FALHOU: budget duplicado (mesma categoria/mês) deveria ser rejeitado';
  END IF;

  -- CASO 4 (RN-08): conta com lançamento vinculado não pode ser DELETADA.
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_id, 'TEST_ACC_RN08', 'checking', 'BRL', 1000)
  RETURNING id INTO v_acc;

  SELECT id INTO v_cat_no_link FROM public.categories WHERE name = 'Transporte' LIMIT 1;

  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_id, v_acc, 'pix', 'TEST_PM_RN08')
  RETURNING id INTO v_pm;

  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_id, v_acc, v_pm, v_cat_no_link, 'expense', 500, current_date);

  v_blocked := false;
  BEGIN
    DELETE FROM public.accounts WHERE id = v_acc;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CASO 4 FALHOU (RN-08): DELETE de conta com lançamento vinculado deveria ter sido bloqueado';
  END IF;

  -- confirma que os lançamentos NÃO sumiram (cascade não foi exercido)
  IF NOT EXISTS (SELECT 1 FROM public.transactions WHERE account_id = v_acc) THEN
    RAISE EXCEPTION 'CASO 4b FALHOU: lançamento foi apagado por cascade apesar do bloqueio';
  END IF;

  -- CASO 5 (RN-09): categoria com lançamento vinculado não pode ser DELETADA.
  v_blocked := false;
  BEGIN
    DELETE FROM public.categories WHERE id = v_cat_no_link;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CASO 5 FALHOU (RN-09): DELETE de categoria com lançamento vinculado deveria ter sido bloqueado';
  END IF;

  -- CASO 6 (RN-09, extensão): categoria com budget vinculado não pode ser DELETADA.
  v_blocked := false;
  BEGIN
    DELETE FROM public.categories WHERE id = v_cat;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CASO 6 FALHOU (RN-09/orçamento): DELETE de categoria com budget vinculado deveria ter sido bloqueado';
  END IF;

  -- CASO 7: categoria SEM vínculo nenhum pode ser deletada normalmente.
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_id, 'TEST_CAT_SEM_VINCULO', 'expense', false)
  RETURNING id INTO v_cat_no_link;

  DELETE FROM public.categories WHERE id = v_cat_no_link;
  IF EXISTS (SELECT 1 FROM public.categories WHERE id = v_cat_no_link) THEN
    RAISE EXCEPTION 'CASO 7 FALHOU: categoria sem vínculo deveria ter sido deletada normalmente';
  END IF;

  RAISE NOTICE 'BE-M-01 (budget + RN-08/RN-09): TODOS OS 7 CASOS PASSARAM';
END;
$test$;

SELECT 'BE-M-01 budget + RN-08/RN-09 guards: PASS' AS result;

ROLLBACK;
