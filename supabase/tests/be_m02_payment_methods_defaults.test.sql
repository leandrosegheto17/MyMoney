-- BE-M-02 — Teste de seed automático das 4 formas de pagamento padrão na
-- primeira conta ativa do usuário, e de que elas não são editáveis/excluíveis.
--
-- Nota (atualização BE-REF-03, 2026-09-04): as asserções de CASO 1/2 foram
-- reescritas para escopar por account_id em vez de "total de is_system_default
-- para o usuário" — o usuário fixture (public.profiles LIMIT 1) é um usuário
-- REAL de produção que já pode ter outras contas/payment_methods próprias, e
-- desde BE-REF-03 (RN-15) toda conta ativa nova (inclusive as deste teste)
-- dispara o seed, não só a 1ª — um COUNT não escopado por conta ficaria
-- contaminado por dado real pré-existente e por double-count entre as 2 contas
-- de teste, quebrando o teste independentemente de qualquer regressão real.
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
  WHERE account_id = v_acc1 AND is_system_default = true;

  IF v_count_defaults <> 4 THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: esperado 4 formas padrão semeadas, obtido %', v_count_defaults;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE account_id = v_acc1 AND type = 'pix' AND is_system_default) THEN
    RAISE EXCEPTION 'CASO 1b FALHOU: forma padrão pix não encontrada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE account_id = v_acc1 AND type = 'debit_card' AND is_system_default) THEN
    RAISE EXCEPTION 'CASO 1c FALHOU: forma padrão debit_card não encontrada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE account_id = v_acc1 AND type = 'boleto' AND is_system_default) THEN
    RAISE EXCEPTION 'CASO 1d FALHOU: forma padrão boleto não encontrada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE account_id = v_acc1 AND type = 'cash' AND is_system_default) THEN
    RAISE EXCEPTION 'CASO 1e FALHOU: forma padrão cash não encontrada';
  END IF;
  -- "crédito" não é semeado no MVP (achado da auditoria — depende de BE-F2-01).
  IF EXISTS (SELECT 1 FROM public.payment_methods WHERE account_id = v_acc1 AND type = 'credit_card' AND is_system_default) THEN
    RAISE EXCEPTION 'CASO 1f FALHOU: crédito não deveria ser semeado no MVP';
  END IF;

  -- CASO 2: segunda conta do mesmo usuário TAMBÉM recebe suas próprias 4 formas
  -- padrão, vinculadas a ELA (não à 1ª conta) — comportamento alterado por
  -- BE-REF-03/RN-15/ADR-016 Decisão 2 (antes desta mudança, só a 1ª conta era
  -- semeada; cobertura dedicada de não-regressão da 1ª conta +
  -- multi-conta/idempotência em supabase/tests/be_ref_03_payment_methods_seed_all_accounts.test.sql).
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_id, 'TEST_ACC_PM2', 'savings', 'BRL', 1000)
  RETURNING id INTO v_acc2;

  SELECT count(*) INTO v_count_defaults
  FROM public.payment_methods
  WHERE account_id = v_acc2 AND is_system_default = true;

  IF v_count_defaults <> 4 THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: segunda conta deveria receber suas próprias 4 formas padrão (BE-REF-03), obtido %', v_count_defaults;
  END IF;

  -- 1ª conta não foi afetada pelo seed da 2ª (linhas continuam vinculadas à 1ª).
  IF (SELECT count(*) FROM public.payment_methods WHERE account_id = v_acc1 AND is_system_default = true) <> 4 THEN
    RAISE EXCEPTION 'CASO 2b FALHOU: seed da 2ª conta não deveria alterar a contagem da 1ª';
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
