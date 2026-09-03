-- BE-M-07 — Testes das RPCs de dashboard: `get_month_provision`,
-- `get_monthly_category_summary` (auditoria de contrato) e a nova
-- `get_month_transaction_count` (RF-MVP-06 AC3). Roda via RLS real
-- (SET LOCAL ROLE authenticated) porque as 3 RPCs usam auth.uid() internamente.
--
-- Execução: supabase db query --linked --file supabase/tests/be_m07_dashboard.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_id      uuid;
  v_acc          uuid;
  v_pm           uuid;
  v_cat_lazer    uuid;
  v_cat_salario  uuid;
  v_count        integer;
  v_total_bal    bigint;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_id, 'TEST_ACC_M07', 'checking', 'BRL', 20000)
  RETURNING id INTO v_acc;

  SELECT id INTO v_pm FROM public.payment_methods WHERE user_id = v_user_id AND is_system_default AND type = 'pix' LIMIT 1;
  SELECT id INTO v_cat_lazer   FROM public.categories WHERE name = 'Lazer' LIMIT 1;
  SELECT id INTO v_cat_salario FROM public.categories WHERE name = 'Salário' LIMIT 1;

  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES
    (v_user_id, v_acc, v_pm, v_cat_lazer,   'expense', 5000, (now() at time zone 'America/Sao_Paulo')::date),
    (v_user_id, v_acc, v_pm, v_cat_salario, 'income',  9000, (now() at time zone 'America/Sao_Paulo')::date);

  -- A partir daqui, roda como authenticated de verdade (as 3 RPCs usam auth.uid()).
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_id::text, 'app_email_mfa_verified', 'true')::text,
    true);

  -- CASO 1 (RF-MVP-06 AC3): get_month_transaction_count reflete os lançamentos do mês.
  SELECT public.get_month_transaction_count() INTO v_count;
  IF v_count < 2 THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: get_month_transaction_count deveria contar ao menos os 2 lançamentos do teste, obtido %', v_count;
  END IF;

  -- CASO 2 (RF-MVP-05 AC1): get_month_provision.current_total_balance_cents é o
  -- saldo consolidado correto (soma de contas ativas, já refletindo os lançamentos).
  SELECT current_total_balance_cents INTO v_total_bal FROM public.get_month_provision();
  IF v_total_bal <> 24000 THEN -- 20000 - 5000 + 9000
    RAISE EXCEPTION 'CASO 2 FALHOU: current_total_balance_cents esperado 24000, obtido %', v_total_bal;
  END IF;

  -- CASO 3 (RF-MVP-06 AC2): get_monthly_category_summary traz a distribuição por categoria.
  IF NOT EXISTS (
    SELECT 1 FROM public.get_monthly_category_summary()
    WHERE category_id = v_cat_lazer AND kind = 'expense' AND total_cents = 5000
  ) THEN
    RAISE EXCEPTION 'CASO 3 FALHOU: get_monthly_category_summary não trouxe a despesa de Lazer esperada';
  END IF;

  RESET ROLE;

  RAISE NOTICE 'BE-M-07 (dashboard RPCs): TODOS OS 3 CASOS PASSARAM';
END;
$test$;

SELECT 'BE-M-07 dashboard RPCs: PASS' AS result;

ROLLBACK;
