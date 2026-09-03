-- BE-M-02 — Teste de seed automático das 4 formas de pagamento padrão na
-- primeira conta ativa do usuário, e de que elas não são editáveis/excluíveis.
--
-- Execução: supabase db query --linked --file supabase/tests/be_m02_payment_methods_defaults.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_id      uuid;
  v_acc1         uuid;
  v_acc2         uuid;
  v_count_defaults integer;
  v_pm_pix       uuid;
  v_blocked      boolean;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  -- CASO 1: primeira conta ativa dispara o seed das 4 formas padrão.
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_id, 'TEST_ACC_PM1', 'checking', 'BRL', 1000)
  RETURNING id INTO v_acc1;

  SELECT count(*) INTO v_count_defaults
  FROM public.payment_methods
  WHERE user_id = v_user_id AND is_system_default = true;

  IF v_count_defaults <> 4 THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: esperado 4 formas padrão semeadas, obtido %', v_count_defaults;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE user_id = v_user_id AND type = 'pix' AND is_system_default) THEN
    RAISE EXCEPTION 'CASO 1b FALHOU: forma padrão pix não encontrada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE user_id = v_user_id AND type = 'debit_card' AND is_system_default) THEN
    RAISE EXCEPTION 'CASO 1c FALHOU: forma padrão debit_card não encontrada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE user_id = v_user_id AND type = 'boleto' AND is_system_default) THEN
    RAISE EXCEPTION 'CASO 1d FALHOU: forma padrão boleto não encontrada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE user_id = v_user_id AND type = 'cash' AND is_system_default) THEN
    RAISE EXCEPTION 'CASO 1e FALHOU: forma padrão cash não encontrada';
  END IF;
  -- "crédito" não é semeado no MVP (achado da auditoria — depende de BE-F2-01).
  IF EXISTS (SELECT 1 FROM public.payment_methods WHERE user_id = v_user_id AND type = 'credit_card' AND is_system_default) THEN
    RAISE EXCEPTION 'CASO 1f FALHOU: crédito não deveria ser semeado no MVP';
  END IF;

  -- CASO 2: segunda conta do mesmo usuário NÃO duplica o seed (idempotência).
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_id, 'TEST_ACC_PM2', 'savings', 'BRL', 1000)
  RETURNING id INTO v_acc2;

  SELECT count(*) INTO v_count_defaults
  FROM public.payment_methods
  WHERE user_id = v_user_id AND is_system_default = true;

  IF v_count_defaults <> 4 THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: segunda conta não deveria re-semear; esperado 4, obtido %', v_count_defaults;
  END IF;

  -- CASO 3: forma padrão não pode ser editada (RLS bloqueia via authenticated,
  -- mas como este teste roda como owner/postgres — que ignora RLS — validamos a
  -- policy diretamente checando sua definição em vez de simular authenticated).
  SELECT id INTO v_pm_pix FROM public.payment_methods
  WHERE user_id = v_user_id AND type = 'pix' AND is_system_default LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payment_methods'
      AND policyname = 'payment_methods_update_own'
      AND qual LIKE '%is_system_default = false%'
  ) THEN
    RAISE EXCEPTION 'CASO 3 FALHOU: policy payment_methods_update_own não protege is_system_default';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payment_methods'
      AND policyname = 'payment_methods_delete_own'
      AND qual LIKE '%is_system_default = false%'
  ) THEN
    RAISE EXCEPTION 'CASO 4 FALHOU: policy payment_methods_delete_own não protege is_system_default';
  END IF;

  RAISE NOTICE 'BE-M-02 (payment_methods defaults): TODOS OS 4 CASOS PASSARAM';
END;
$test$;

SELECT 'BE-M-02 payment_methods defaults: PASS' AS result;

ROLLBACK;
