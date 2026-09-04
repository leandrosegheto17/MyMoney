-- BE-REF-03 — accounts_seed_default_payment_methods() estendida para semear as
-- 4 formas de pagamento não-cartão em TODA conta ativa nova, não só a 1ª
-- (RN-15, ADR-016 Decisão 2). Confirma:
--
--   (1) 1ª conta continua se comportando exatamente como antes (sem regressão);
--   (2) 2ª/3ª conta recebem suas próprias 4 formas, vinculadas a cada uma;
--   (3) "Crédito" continua fora do seed automático;
--   (4) conta INATIVA (is_active=false na criação) não dispara o seed (trigger
--       inalterado, WHEN (new.is_active = true)).
--
-- Execução: supabase db query --linked --file supabase/tests/be_ref_03_payment_methods_seed_all_accounts.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_id        uuid;
  v_acc1           uuid;
  v_acc2           uuid;
  v_acc3           uuid;
  v_acc_inactive   uuid;
  v_count_acc1     integer;
  v_count_acc2     integer;
  v_count_acc3     integer;
  v_count_inactive integer;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  -- CASO 1: 1ª conta ativa — comportamento inalterado (4 formas próprias).
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_id, 'TEST_ACC_REF03_1', 'checking', 'BRL', 1000)
  RETURNING id INTO v_acc1;

  SELECT count(*) INTO v_count_acc1
  FROM public.payment_methods
  WHERE account_id = v_acc1 AND is_system_default = true;

  IF v_count_acc1 <> 4 THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: 1ª conta deveria ter 4 formas padrão vinculadas, obtido %', v_count_acc1;
  END IF;
  IF EXISTS (SELECT 1 FROM public.payment_methods WHERE account_id = v_acc1 AND type = 'credit_card') THEN
    RAISE EXCEPTION 'CASO 1b FALHOU: crédito não deveria ser semeado automaticamente';
  END IF;

  -- CASO 2: 2ª conta ativa — recebe SUAS PRÓPRIAS 4 formas (RN-15/ADR-016 Decisão 2).
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_id, 'TEST_ACC_REF03_2', 'savings', 'BRL', 1000)
  RETURNING id INTO v_acc2;

  SELECT count(*) INTO v_count_acc2
  FROM public.payment_methods
  WHERE account_id = v_acc2 AND is_system_default = true;

  IF v_count_acc2 <> 4 THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: 2ª conta deveria receber suas próprias 4 formas padrão, obtido %', v_count_acc2;
  END IF;

  -- 1ª conta não foi afetada pelo seed da 2ª (linhas continuam vinculadas à 1ª).
  SELECT count(*) INTO v_count_acc1
  FROM public.payment_methods
  WHERE account_id = v_acc1 AND is_system_default = true;
  IF v_count_acc1 <> 4 THEN
    RAISE EXCEPTION 'CASO 2c FALHOU: seed da 2ª conta não deveria alterar a contagem da 1ª, obtido %', v_count_acc1;
  END IF;

  -- CASO 3: 3ª conta ativa — mesmo comportamento, prova que não é "1ª + 2ª só".
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_id, 'TEST_ACC_REF03_3', 'checking', 'BRL', 1000)
  RETURNING id INTO v_acc3;

  SELECT count(*) INTO v_count_acc3
  FROM public.payment_methods
  WHERE account_id = v_acc3 AND is_system_default = true;

  IF v_count_acc3 <> 4 THEN
    RAISE EXCEPTION 'CASO 3 FALHOU: 3ª conta deveria receber suas próprias 4 formas padrão, obtido %', v_count_acc3;
  END IF;
  IF EXISTS (SELECT 1 FROM public.payment_methods WHERE account_id = v_acc3 AND type = 'credit_card') THEN
    RAISE EXCEPTION 'CASO 3b FALHOU: crédito não deveria ser semeado automaticamente na 3ª conta';
  END IF;

  -- CASO 4: conta criada já INATIVA não dispara o seed (trigger inalterado).
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents, is_active)
  VALUES (v_user_id, 'TEST_ACC_REF03_INACTIVE', 'checking', 'BRL', 1000, false)
  RETURNING id INTO v_acc_inactive;

  SELECT count(*) INTO v_count_inactive
  FROM public.payment_methods
  WHERE account_id = v_acc_inactive;

  IF v_count_inactive <> 0 THEN
    RAISE EXCEPTION 'CASO 4 FALHOU: conta criada inativa não deveria disparar o seed, obtido %', v_count_inactive;
  END IF;

  RAISE NOTICE 'BE-REF-03 (seed de payment_methods em toda conta ativa nova, casos 1-4): TODOS PASSARAM';
END;
$test$;

SELECT 'BE-REF-03 payment_methods seed all accounts: PASS' AS result;

ROLLBACK;
