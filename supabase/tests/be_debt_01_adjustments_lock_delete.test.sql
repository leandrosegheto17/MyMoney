-- BE-DEBT-01 — DELETE de recurring_template_adjustments: rejeitado se vigente
-- (effective_from <= mês corrente), permitido se futuro; isolamento cross-user;
-- exclusão em cascata do template continua funcionando.
-- Via RLS real (SET LOCAL ROLE authenticated + request.jwt.claims).
-- Execução: supabase db query --linked --file supabase/tests/be_debt_01_adjustments_lock_delete.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_a      uuid;
  v_user_b      uuid := gen_random_uuid();
  v_acc_a       uuid;
  v_cat_a       uuid;
  v_pm_a        uuid;
  v_tpl_a       uuid;
  v_tpl_b       uuid;
  v_adj_now     uuid;
  v_adj_future  uuid;
  v_adj_b       uuid;
  v_month_start date := date_trunc('month', current_date)::date;
  v_count       integer;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-b-debt01@example.com', 'BE-DEBT-01 — usuário B fixture, só nesta transação');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'test-b-debt01@example.com');

  DECLARE
    v_acc_b uuid; v_cat_b uuid; v_pm_b uuid;
  BEGIN
    INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
    VALUES (v_user_b, 'TEST_ACC_DEBT01_B', 'checking', 'BRL', 1000) RETURNING id INTO v_acc_b;
    INSERT INTO public.categories (user_id, name, kind, is_system_default)
    VALUES (v_user_b, 'TEST_CAT_DEBT01_B', 'expense', false) RETURNING id INTO v_cat_b;
    INSERT INTO public.payment_methods (user_id, account_id, type, name)
    VALUES (v_user_b, v_acc_b, 'pix', 'TEST_PM_DEBT01_B') RETURNING id INTO v_pm_b;
    INSERT INTO public.recurring_templates
      (user_id, description, amount_cents, category_id, account_id, payment_method_id, day_of_month, start_date)
    VALUES (v_user_b, 'TEST_TPL_DEBT01_B', 5000, v_cat_b, v_acc_b, v_pm_b, 1, v_month_start)
    RETURNING id INTO v_tpl_b;
    INSERT INTO public.recurring_template_adjustments (recurring_template_id, user_id, effective_from, amount_cents)
    VALUES (v_tpl_b, v_user_b, (v_month_start + interval '1 month')::date, 6000) RETURNING id INTO v_adj_b;
  END;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text, true);

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_DEBT01_A', 'checking', 'BRL', 100000) RETURNING id INTO v_acc_a;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_DEBT01_A', 'expense', false) RETURNING id INTO v_cat_a;
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_a, v_acc_a, 'pix', 'TEST_PM_DEBT01_A') RETURNING id INTO v_pm_a;
  INSERT INTO public.recurring_templates
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, day_of_month, start_date)
  VALUES (v_user_a, 'TEST_TPL_DEBT01_A', 10000, v_cat_a, v_acc_a, v_pm_a, 1, v_month_start)
  RETURNING id INTO v_tpl_a;

  INSERT INTO public.recurring_template_adjustments (recurring_template_id, user_id, effective_from, amount_cents)
  VALUES (v_tpl_a, v_user_a, v_month_start, 20000) RETURNING id INTO v_adj_now;
  INSERT INTO public.recurring_template_adjustments (recurring_template_id, user_id, effective_from, amount_cents)
  VALUES (v_tpl_a, v_user_a, (v_month_start + interval '2 months')::date, 30000) RETURNING id INTO v_adj_future;

  -- CASO 1: DELETE de reajuste vigente (competência corrente) é rejeitado (23514).
  BEGIN
    DELETE FROM public.recurring_template_adjustments WHERE id = v_adj_now;
    RESET ROLE;
    RAISE EXCEPTION 'CASO 1 FALHOU: DELETE de reajuste vigente deveria ser rejeitado';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
  SELECT count(*) INTO v_count FROM public.recurring_template_adjustments WHERE id = v_adj_now;
  IF v_count <> 1 THEN RESET ROLE; RAISE EXCEPTION 'CASO 1 FALHOU: reajuste vigente não deveria ter sido apagado'; END IF;

  -- CASO 2: DELETE de reajuste futuro ainda não consumido é permitido.
  DELETE FROM public.recurring_template_adjustments WHERE id = v_adj_future;
  SELECT count(*) INTO v_count FROM public.recurring_template_adjustments WHERE id = v_adj_future;
  IF v_count <> 0 THEN RESET ROLE; RAISE EXCEPTION 'CASO 2 FALHOU: reajuste futuro deveria ter sido excluído'; END IF;

  -- CASO 3: isolamento cross-user — reajuste de B invisível para A (RLS filtra, 0 linhas).
  DELETE FROM public.recurring_template_adjustments WHERE id = v_adj_b;
  RESET ROLE;
  SELECT count(*) INTO v_count FROM public.recurring_template_adjustments WHERE id = v_adj_b;
  IF v_count <> 1 THEN RAISE EXCEPTION 'CASO 3 FALHOU: A não deveria conseguir excluir reajuste de B'; END IF;

  -- CASO 4: exclusão em cascata do template continua funcionando, mesmo com reajuste vigente.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text, true);
  DELETE FROM public.recurring_templates WHERE id = v_tpl_a;
  RESET ROLE;
  SELECT count(*) INTO v_count FROM public.recurring_template_adjustments WHERE recurring_template_id = v_tpl_a;
  IF v_count <> 0 THEN RAISE EXCEPTION 'CASO 4 FALHOU: DELETE do template deveria cascatear para os reajustes'; END IF;

  RAISE NOTICE 'BE-DEBT-01 (rejeita vigente, permite futuro, isolamento, cascata): TODOS PASSARAM';
END;
$test$;

SELECT 'BE-DEBT-01 recurring_template_adjustments delete lock: PASS' AS result;

ROLLBACK;
