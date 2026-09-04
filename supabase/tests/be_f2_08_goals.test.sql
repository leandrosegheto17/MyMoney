-- BE-F2-08 — Modelo de dados de metas (`goals`, `contributions`) + cálculo
-- de percentual de progresso (RF-F2-08 AC1-2).
--
-- Prova, via RLS real (SET LOCAL ROLE authenticated + request.jwt.claims,
-- nunca como owner/postgres — mesmo padrão de BE-F2-01 a BE-F2-07):
--   (A) constraints físicas (target_amount_cents/amount_cents > 0);
--   (B) get_goals_progress calcula corretamente: 0 aportes -> 0%/0 cents;
--       1º aporte -> recalcula; 2º aporte -> recalcula de novo (critério de
--       aceite literal, "recalculado a cada aporte vinculado"); remover um
--       aporte também recalcula (pra baixo) — cobre os 3 gatilhos (inserir/
--       remover) de recálculo, não só o caminho feliz de inserção única;
--   (C) pct_progress pode passar de 100% quando a meta é superada, sem clamp;
--   (D) is_active default true, editável (arquivar sem excluir);
--   (E) isolamento cross-user + IDOR (contribution.goal_id de outro usuário,
--       tanto no INSERT quanto redirecionando via UPDATE).
--
-- Execução: supabase db query --linked --file supabase/tests/be_f2_08_goals.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_a    uuid;
  v_user_b    uuid := gen_random_uuid();
  v_goal_b    uuid;
  v_goal_1    uuid; -- progresso incremental + is_active
  v_goal_2    uuid; -- fluxo legítimo
  v_contrib_1 uuid;
  v_contrib_2 uuid;
  v_current   bigint;
  v_pct       numeric;
  v_blocked   boolean;
  v_is_active boolean;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-b-f208@example.com', 'BE-F2-08 — usuário B fixture, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'test-b-f208@example.com');

  -- Fixture de B (como postgres) — 1 meta com 1 aporte, só para isolamento/IDOR.
  INSERT INTO public.goals (user_id, name, target_amount_cents)
  VALUES (v_user_b, 'TEST_GOAL_F208_B', 100000)
  RETURNING id INTO v_goal_b;
  INSERT INTO public.contributions (goal_id, user_id, amount_cents)
  VALUES (v_goal_b, v_user_b, 50000);

  -- ===================== Assume identidade de A (RLS real) =====================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  -- ===================== CASO A1 — target_amount_cents > 0 =====================

  v_blocked := false;
  BEGIN
    INSERT INTO public.goals (user_id, name, target_amount_cents) VALUES (v_user_a, 'TEST_GOAL_F208_INVALID', 0);
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A1 FALHOU: target_amount_cents <= 0 deveria ser rejeitado';
  END IF;

  -- ===================== CASO B/C/D — progresso incremental, is_active =====================

  INSERT INTO public.goals (user_id, name, target_amount_cents, target_date)
  VALUES (v_user_a, 'TEST_GOAL_F208_PROGRESS', 100000, (current_date + interval '6 months')::date)
  RETURNING id INTO v_goal_1;

  -- D1: is_active default true.
  SELECT is_active INTO v_is_active FROM public.get_goals_progress() WHERE goal_id = v_goal_1;
  IF v_is_active IS NOT TRUE THEN
    RESET ROLE; RAISE EXCEPTION 'CASO D1 FALHOU: is_active deveria ser true por padrão';
  END IF;

  -- B1: sem aporte ainda — 0 cents, 0%.
  SELECT current_amount_cents, pct_progress INTO v_current, v_pct FROM public.get_goals_progress() WHERE goal_id = v_goal_1;
  IF v_current <> 0 OR v_pct <> 0 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO B1 FALHOU: sem aporte deveria ser 0 cents/0 pct, obtido % / %', v_current, v_pct;
  END IF;

  -- B2: 1º aporte (30000 de 100000 = 30%).
  INSERT INTO public.contributions (goal_id, user_id, amount_cents) VALUES (v_goal_1, v_user_a, 30000) RETURNING id INTO v_contrib_1;
  SELECT current_amount_cents, pct_progress INTO v_current, v_pct FROM public.get_goals_progress() WHERE goal_id = v_goal_1;
  IF v_current <> 30000 OR v_pct <> 30 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO B2 FALHOU: após 1º aporte, esperado 30000/30, obtido % / %', v_current, v_pct;
  END IF;

  -- B3/C1: 2º aporte (mais 90000 -> total 120000 = 120%, meta superada, sem clamp).
  INSERT INTO public.contributions (goal_id, user_id, amount_cents) VALUES (v_goal_1, v_user_a, 90000) RETURNING id INTO v_contrib_2;
  SELECT current_amount_cents, pct_progress INTO v_current, v_pct FROM public.get_goals_progress() WHERE goal_id = v_goal_1;
  IF v_current <> 120000 OR v_pct <> 120 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO B3/C1 FALHOU: após 2º aporte (meta superada), esperado 120000/120, obtido % / %', v_current, v_pct;
  END IF;

  -- B4: remover o 2º aporte recalcula de volta pra baixo.
  DELETE FROM public.contributions WHERE id = v_contrib_2;
  SELECT current_amount_cents, pct_progress INTO v_current, v_pct FROM public.get_goals_progress() WHERE goal_id = v_goal_1;
  IF v_current <> 30000 OR v_pct <> 30 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO B4 FALHOU: após remover o 2º aporte, esperado voltar a 30000/30, obtido % / %', v_current, v_pct;
  END IF;

  -- D2: is_active editável (arquivar meta sem excluir).
  UPDATE public.goals SET is_active = false WHERE id = v_goal_1;
  SELECT is_active INTO v_is_active FROM public.get_goals_progress() WHERE goal_id = v_goal_1;
  IF v_is_active IS NOT FALSE THEN
    RESET ROLE; RAISE EXCEPTION 'CASO D2 FALHOU: is_active deveria ser editável para false';
  END IF;

  -- ===================== CASO A2 — amount_cents > 0 =====================

  v_blocked := false;
  BEGIN
    INSERT INTO public.contributions (goal_id, user_id, amount_cents) VALUES (v_goal_1, v_user_a, 0);
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A2 FALHOU: amount_cents <= 0 deveria ser rejeitado';
  END IF;

  -- ===================== CASO E — isolamento cross-user + IDOR =====================

  -- A não enxerga a meta de B.
  PERFORM 1 FROM public.goals WHERE id = v_goal_b;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO E1 FALHOU: A não deveria enxergar a meta de B via SELECT';
  END IF;

  PERFORM 1 FROM public.get_goals_progress() WHERE goal_id = v_goal_b;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO E2 FALHOU: get_goals_progress não deveria trazer a meta de B';
  END IF;

  -- IDOR: A não pode registrar aporte diretamente na meta de B.
  v_blocked := false;
  BEGIN
    INSERT INTO public.contributions (goal_id, user_id, amount_cents) VALUES (v_goal_b, v_user_a, 1000);
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO E3 FALHOU (IDOR): A não deveria conseguir registrar aporte na meta de B';
  END IF;

  -- IDOR: A não pode redirecionar aporte próprio para a meta de B via UPDATE.
  v_blocked := false;
  BEGIN
    UPDATE public.contributions SET goal_id = v_goal_b WHERE id = v_contrib_1;
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO E4 FALHOU (IDOR): A não deveria conseguir redirecionar aporte próprio para a meta de B';
  END IF;

  -- ===================== Fluxo legítimo sem regressão =====================

  INSERT INTO public.goals (user_id, name, target_amount_cents) VALUES (v_user_a, 'TEST_GOAL_F208_LEGIT', 50000) RETURNING id INTO v_goal_2;
  INSERT INTO public.contributions (goal_id, user_id, amount_cents) VALUES (v_goal_2, v_user_a, 5000);
  SELECT current_amount_cents INTO v_current FROM public.get_goals_progress() WHERE goal_id = v_goal_2;
  IF v_current <> 5000 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO F1 FALHOU: fluxo legítimo (meta + aporte próprios) deveria refletir 5000, obtido %', v_current;
  END IF;

  RESET ROLE;

  RAISE NOTICE 'BE-F2-08 (constraints, progresso incremental/recalculado, is_active, isolamento/IDOR): TODOS PASSARAM';
END;
$test$;

SELECT 'BE-F2-08 goals/contributions: PASS' AS result;

ROLLBACK;
