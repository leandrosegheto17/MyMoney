-- BE-M-08 — Testes de `get_budget_status` (RF-MVP-07 AC2-4, RN-04): sem alerta
-- abaixo de 80%, alerta em >=80%, estouro acima de 100%.
--
-- Execução: supabase db query --linked --file supabase/tests/be_m08_budget_status.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_id   uuid;
  v_acc       uuid;
  v_pm        uuid;
  v_cat       uuid;
  v_month     date;
  v_level     text;
  v_pct       numeric;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  v_month := date_trunc('month', (now() at time zone 'America/Sao_Paulo')::date)::date;

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_id, 'TEST_ACC_M08', 'checking', 'BRL', 100000)
  RETURNING id INTO v_acc;

  SELECT id INTO v_pm  FROM public.payment_methods WHERE user_id = v_user_id AND is_system_default AND type = 'pix' LIMIT 1;
  SELECT id INTO v_cat FROM public.categories WHERE name = 'Saúde' LIMIT 1;

  INSERT INTO public.budget (user_id, category_id, month, limit_cents, alert_threshold_pct)
  VALUES (v_user_id, v_cat, v_month, 10000, 80);

  -- CASO 1: 50% gasto -> alert_level = 'none'.
  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_id, v_acc, v_pm, v_cat, 'expense', 5000, (now() at time zone 'America/Sao_Paulo')::date);

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_id::text, 'app_email_mfa_verified', 'true')::text,
    true);

  SELECT alert_level, pct_spent INTO v_level, v_pct
  FROM public.get_budget_status() WHERE category_id = v_cat;

  IF v_level <> 'none' OR v_pct <> 50.00 THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: esperado none/50%%, obtido %/%', v_level, v_pct;
  END IF;

  RESET ROLE;

  -- CASO 2: +35% (total 85%) -> alert_level = 'warning' (RN-04 AC3, >=80%).
  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_id, v_acc, v_pm, v_cat, 'expense', 3500, (now() at time zone 'America/Sao_Paulo')::date);

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_id::text, 'app_email_mfa_verified', 'true')::text,
    true);

  SELECT alert_level, pct_spent INTO v_level, v_pct
  FROM public.get_budget_status() WHERE category_id = v_cat;

  IF v_level <> 'warning' OR v_pct <> 85.00 THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: esperado warning/85%%, obtido %/%', v_level, v_pct;
  END IF;

  RESET ROLE;

  -- CASO 3: +20% (total 105%) -> alert_level = 'exceeded' (RN-04 AC4, >100%).
  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_id, v_acc, v_pm, v_cat, 'expense', 2000, (now() at time zone 'America/Sao_Paulo')::date);

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_id::text, 'app_email_mfa_verified', 'true')::text,
    true);

  SELECT alert_level, pct_spent INTO v_level, v_pct
  FROM public.get_budget_status() WHERE category_id = v_cat;

  IF v_level <> 'exceeded' OR v_pct <> 105.00 THEN
    RAISE EXCEPTION 'CASO 3 FALHOU: esperado exceeded/105%%, obtido %/%', v_level, v_pct;
  END IF;

  RESET ROLE;

  RAISE NOTICE 'BE-M-08 (get_budget_status): TODOS OS 3 CASOS PASSARAM';
END;
$test$;

SELECT 'BE-M-08 get_budget_status: PASS' AS result;

ROLLBACK;
