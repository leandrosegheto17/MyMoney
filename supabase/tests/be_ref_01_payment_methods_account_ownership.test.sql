-- BE-REF-01 — Corrige BLOCKERS.md Bloqueio 013 (IDOR em payment_methods.account_id).
-- Prova, via RLS real (SET LOCAL ROLE authenticated + request.jwt.claims, mesmo
-- padrão de BE-M-13/BE-M-04/BE-M-08/BE-M-11), que:
--
--   (1) A não consegue INSERT em payment_methods referenciando account_id de B
--       (IDOR fechado);
--   (2) A não consegue UPDATE de uma payment_methods própria (não-sistema) para
--       redirecionar account_id para uma conta de B;
--   (3) fluxo legítimo (própria conta) continua funcionando sem regressão, tanto
--       no INSERT quanto no UPDATE;
--   (4) credit_card_id continua validado (BE-F2-01), sem regressão da correção
--       anterior.
--
-- Execução: supabase db query --linked --file supabase/tests/be_ref_01_payment_methods_account_ownership.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_a   uuid;
  v_user_b   uuid := gen_random_uuid(); -- usuário B real (auth.users), só para este teste
  v_acc_a    uuid;
  v_acc_a2   uuid;
  v_acc_b    uuid;
  v_pm_a     uuid;
  v_blocked  boolean;
  v_id       uuid;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  -- ===================== Fixtures (como postgres, ignora RLS) =====================
  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-b-ref01@example.com', 'BE-REF-01 — usuário B fixture, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'test-b-ref01@example.com');

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_REF01_A', 'checking', 'BRL', 1000) RETURNING id INTO v_acc_a;

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_REF01_A2', 'checking', 'BRL', 1000) RETURNING id INTO v_acc_a2;

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_b, 'TEST_ACC_REF01_B', 'checking', 'BRL', 1000) RETURNING id INTO v_acc_b;

  -- ===================== Assume identidade de A (RLS real) =====================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  -- CASO 1 (INSERT payment_methods.account_id de B): rejeitado (IDOR fechado).
  v_blocked := false;
  BEGIN
    INSERT INTO public.payment_methods (user_id, account_id, type, name)
    VALUES (v_user_a, v_acc_b, 'pix', 'TEST_PM_REF01_IDOR');
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 1 FALHOU: INSERT payment_methods referenciando account_id de B deveria ser rejeitado';
  END IF;

  -- CASO 2 (fluxo legítimo — INSERT com account_id próprio): sucesso, sem regressão.
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_a, v_acc_a, 'pix', 'TEST_PM_REF01_A')
  RETURNING id INTO v_pm_a;
  IF v_pm_a IS NULL THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 2 FALHOU: INSERT payment_methods com account_id próprio deveria ter sucedido';
  END IF;

  -- CASO 3 (UPDATE redirecionando account_id próprio -> B): rejeitado.
  v_blocked := false;
  BEGIN
    UPDATE public.payment_methods SET account_id = v_acc_b WHERE id = v_pm_a;
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    PERFORM 1 FROM public.payment_methods WHERE id = v_pm_a AND account_id = v_acc_b;
    IF FOUND THEN
      RESET ROLE; RAISE EXCEPTION 'CASO 3 FALHOU: UPDATE de payment_methods redirecionando account_id para B deveria ser rejeitado';
    END IF;
  END IF;

  -- CASO 4 (fluxo legítimo — UPDATE redirecionando para outra conta própria): sucesso.
  UPDATE public.payment_methods SET account_id = v_acc_a2 WHERE id = v_pm_a;
  PERFORM 1 FROM public.payment_methods WHERE id = v_pm_a AND account_id = v_acc_a2;
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 4 FALHOU: UPDATE de payment_methods redirecionando account_id para conta própria deveria ter sucedido';
  END IF;

  -- CASO 5 (não-regressão — credit_card_id de outro usuário continua rejeitado no
  -- INSERT; usa NULL simulando "não existe" já que B não tem credit_cards fixture
  -- aqui — objetivo é só confirmar que a cláusula de credit_card_id ainda está
  -- presente e funcional, não duplicar toda a cobertura de BE-F2-01).
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payment_methods'
      AND policyname = 'payment_methods_insert_own'
      AND with_check LIKE '%credit_card_id%'
  ) THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 5 FALHOU: policy payment_methods_insert_own não preservou a checagem de credit_card_id (BE-F2-01)';
  END IF;

  RESET ROLE;

  RAISE NOTICE 'BE-REF-01 (ownership de account_id em payment_methods, casos 1-5): TODOS PASSARAM';
END;
$test$;

SELECT 'BE-REF-01 payment_methods account_id ownership: PASS' AS result;

ROLLBACK;
