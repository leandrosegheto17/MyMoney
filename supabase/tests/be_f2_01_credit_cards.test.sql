-- BE-F2-01 — Modelo de dados de Cartão de Crédito (RF-F2-01 AC1) + vínculo
-- automático como forma de pagamento "crédito" + correção transparente de
-- ownership de FK em payment_methods.credit_card_id (mesma classe de risco de
-- BE-M-13/Bloqueio 010/SEC-DEBT-002, ver nota de escopo na migration).
--
-- Prova, via RLS real (SET LOCAL ROLE authenticated + request.jwt.claims, nunca
-- como owner/postgres — mesmo padrão de BE-M-04/BE-M-08/BE-M-11/BE-M-13):
--   (1) Cadastrar um cartão disponibiliza "crédito" como forma de pagamento
--       vinculada automaticamente (RF-F2-01 AC1, o critério de aceite da tarefa);
--   (2) Constraints físicas (limite positivo, dia de fechamento/vencimento 1-31);
--   (3) Isolamento cross-user: B nunca lê/edita/exclui cartão de A (RLS+MFA gate);
--   (4) B não consegue vincular um payment_method próprio ao credit_card_id de A,
--       nem redirecionar um payment_method próprio para o cartão de A (IDOR);
--   (5) Fluxo legítimo (2º cartão do mesmo usuário, edição) sem regressão;
--   (6) DELETE de cartão sem lançamento vinculado remove em cascata sua forma de
--       pagamento derivada (payment_methods.credit_card_id -> credit_cards ON
--       DELETE CASCADE).
--
-- Execução: supabase db query --linked --file supabase/tests/be_f2_01_credit_cards.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_a   uuid;
  v_user_b   uuid := gen_random_uuid(); -- usuário B real (auth.users), precisa possuir fixture própria (caso 4)
  v_card_a   uuid;
  v_card_a2  uuid;
  v_card_b   uuid;
  v_pm_a     uuid;
  v_pm_b     uuid;
  v_blocked  boolean;
  v_count    integer;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  -- Usuário B real (accounts/categories/credit_cards têm FK ON DELETE CASCADE
  -- para auth.users(id) — B precisa existir de fato para ser DONO de uma
  -- fixture, mesmo padrão de BE-M-13).
  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-b-f201@example.com', 'BE-F2-01 — usuário B fixture, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'test-b-f201@example.com');

  -- ===================== Assume identidade de A (RLS real) =====================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  -- CASO 1 (RF-F2-01 AC1): cadastrar cartão disponibiliza "crédito" vinculado.
  INSERT INTO public.credit_cards (user_id, name, limit_cents, closing_day, due_day)
  VALUES (v_user_a, 'TEST_CARD_F201_A', 500000, 10, 20)
  RETURNING id INTO v_card_a;

  SELECT id INTO v_pm_a
  FROM public.payment_methods
  WHERE credit_card_id = v_card_a AND type = 'credit_card' AND user_id = v_user_a;

  IF v_pm_a IS NULL THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 1 FALHOU: cartão cadastrado não gerou forma de pagamento "crédito" vinculada (RF-F2-01 AC1)';
  END IF;

  PERFORM 1 FROM public.payment_methods WHERE id = v_pm_a AND name = 'TEST_CARD_F201_A' AND is_system_default = false;
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 1b FALHOU: forma de pagamento derivada deveria ter o nome do cartão e is_system_default = false';
  END IF;

  -- CASO 2 (constraints físicas): limite não-positivo e dia fora do range 1-31.
  v_blocked := false;
  BEGIN
    INSERT INTO public.credit_cards (user_id, name, limit_cents, closing_day, due_day)
    VALUES (v_user_a, 'TEST_CARD_F201_BAD_LIMIT', 0, 10, 20);
  EXCEPTION WHEN check_violation THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 2a FALHOU: limit_cents = 0 deveria violar credit_cards_limit_positive';
  END IF;

  v_blocked := false;
  BEGIN
    INSERT INTO public.credit_cards (user_id, name, limit_cents, closing_day, due_day)
    VALUES (v_user_a, 'TEST_CARD_F201_BAD_DAY', 100000, 32, 20);
  EXCEPTION WHEN check_violation THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 2b FALHOU: closing_day = 32 deveria violar credit_cards_closing_day_range';
  END IF;

  -- CASO 5 (fluxo legítimo — 2º cartão + edição): sem regressão.
  INSERT INTO public.credit_cards (user_id, name, limit_cents, closing_day, due_day)
  VALUES (v_user_a, 'TEST_CARD_F201_A2', 300000, 5, 15)
  RETURNING id INTO v_card_a2;

  PERFORM 1 FROM public.payment_methods WHERE credit_card_id = v_card_a2 AND type = 'credit_card';
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 5a FALHOU: 2º cartão do mesmo usuário deveria gerar sua própria forma de pagamento';
  END IF;

  UPDATE public.credit_cards SET limit_cents = 550000 WHERE id = v_card_a;
  PERFORM 1 FROM public.credit_cards WHERE id = v_card_a AND limit_cents = 550000;
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 5b FALHOU: UPDATE de cartão próprio deveria ter sucedido';
  END IF;

  RESET ROLE;

  -- ===================== Fixture de B (como postgres) =====================
  INSERT INTO public.credit_cards (user_id, name, limit_cents, closing_day, due_day)
  VALUES (v_user_b, 'TEST_CARD_F201_B', 200000, 1, 10)
  RETURNING id INTO v_card_b;

  SELECT id INTO v_pm_b FROM public.payment_methods WHERE credit_card_id = v_card_b;
  IF v_pm_b IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: cartão de B deveria ter gerado sua forma de pagamento (trigger roda independente de quem insere)';
  END IF;

  -- ===================== Assume identidade de A de novo (ataca B) =====================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  -- CASO 3 (isolamento cross-user — SELECT/UPDATE/DELETE de cartão de B): 0 linhas.
  SELECT count(*) INTO v_count FROM public.credit_cards WHERE id = v_card_b;
  IF v_count <> 0 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 3a FALHOU: A não deveria enxergar o cartão de B via SELECT';
  END IF;

  UPDATE public.credit_cards SET limit_cents = 1 WHERE id = v_card_b;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 3b FALHOU: A não deveria conseguir UPDATE no cartão de B';
  END IF;

  DELETE FROM public.credit_cards WHERE id = v_card_b;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 3c FALHOU: A não deveria conseguir DELETE no cartão de B';
  END IF;

  -- CASO 4 (IDOR — payment_methods.credit_card_id de B): rejeitado tanto no
  -- INSERT direto quanto no UPDATE de um payment_method próprio de A.
  v_blocked := false;
  BEGIN
    INSERT INTO public.payment_methods (user_id, credit_card_id, type, name)
    VALUES (v_user_a, v_card_b, 'credit_card', 'TEST_PM_F201_IDOR_INSERT');
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 4a FALHOU: INSERT payment_method referenciando credit_card_id de B deveria ser rejeitado';
  END IF;

  v_blocked := false;
  BEGIN
    UPDATE public.payment_methods SET credit_card_id = v_card_b WHERE id = v_pm_a;
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    PERFORM 1 FROM public.payment_methods WHERE id = v_pm_a AND credit_card_id = v_card_b;
    IF FOUND THEN
      RESET ROLE; RAISE EXCEPTION 'CASO 4b FALHOU: UPDATE de payment_method próprio redirecionando credit_card_id para B deveria ser rejeitado';
    END IF;
  END IF;

  RESET ROLE;

  RAISE NOTICE 'BE-F2-01 (credit_cards, vínculo automático, constraints, isolamento cross-user, IDOR de credit_card_id, casos 1-5): TODOS PASSARAM';
END;
$test$;

-- ===================== CASO 6 (cascade de DELETE, sem lançamento vinculado) =====================
-- Isolado em bloco próprio (como postgres) só para checar o efeito da FK
-- ON DELETE CASCADE sem depender de RLS.

DO $test$
DECLARE
  v_user_a  uuid;
  v_card    uuid;
  v_pm      uuid;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;

  INSERT INTO public.credit_cards (user_id, name, limit_cents, closing_day, due_day)
  VALUES (v_user_a, 'TEST_CARD_F201_CASCADE', 100000, 1, 10)
  RETURNING id INTO v_card;

  SELECT id INTO v_pm FROM public.payment_methods WHERE credit_card_id = v_card;
  IF v_pm IS NULL THEN
    RAISE EXCEPTION 'FIXTURE CASO 6: cartão deveria ter gerado forma de pagamento derivada';
  END IF;

  DELETE FROM public.credit_cards WHERE id = v_card;

  PERFORM 1 FROM public.payment_methods WHERE id = v_pm;
  IF FOUND THEN
    RAISE EXCEPTION 'CASO 6 FALHOU: forma de pagamento derivada deveria ter sido removida em cascata (payment_methods_credit_card_id_fkey ON DELETE CASCADE)';
  END IF;

  RAISE NOTICE 'BE-F2-01 CASO 6 (cascade DELETE credit_cards -> payment_methods): PASSOU';
END;
$test$;

SELECT 'BE-F2-01 credit_cards: PASS' AS result;

ROLLBACK;
