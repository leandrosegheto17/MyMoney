-- BE-F2-09 — Infraestrutura de notificações unificada (RF-F2-09 AC1-2).
--
-- Prova, via RLS real (SET LOCAL ROLE authenticated + request.jwt.claims,
-- nunca como owner/postgres — mesmo padrão de BE-M-13/BE-F2-01 a 06):
--   (A) push_subscriptions: CRUD próprio funciona, isolamento cross-user;
--   (B) notifications: client NUNCA consegue INSERT direto (só notify_user,
--       SECURITY DEFINER); UPDATE (marcar como lida) funciona; isolamento
--       cross-user;
--   (C) notify_user() persiste a notificação corretamente (AC2, histórico
--       consultável independente de push — testável mesmo sem dispositivo
--       real inscrito, já que a Edge Function é chamada de forma
--       assíncrona via pg_net e não bloqueia a escrita da linha);
--   (D) check_budget_alerts() (RF-MVP-07/RN-04, AC1): dispara ao cruzar 80%
--       (warning), dispara de novo ao cruzar 100% (exceeded, nível
--       diferente), não duplica o MESMO nível no mesmo mês (dedup).
--
-- Nota: notify_user() dispara uma chamada real (assíncrona, via pg_net) à
-- Edge Function push-dispatch a cada notificação criada neste teste — mesmo
-- comportamento de produção, aceitável (poucas chamadas, mesmo padrão já
-- usado nos smoke tests manuais de BE-M-10/BE-F2-02/03/06/09). Como este
-- teste roda em BEGIN...ROLLBACK, a notificação pode já não existir mais
-- quando a Edge Function (assíncrona) tentar lê-la — inofensivo, só resulta
-- num 404 sem efeito colateral real.
--
-- Execução: supabase db query --linked --file supabase/tests/be_f2_09_notifications.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_a        uuid;
  v_user_b        uuid := gen_random_uuid();
  v_acc_a         uuid;
  v_cat_a         uuid;
  v_pm_a          uuid;
  v_sub_a         uuid;
  v_sub_b         uuid;
  v_notif_id      uuid;
  v_budget_id     uuid;
  v_month_start   date := date_trunc('month', current_date)::date;
  v_count         integer;
  v_blocked       boolean;
  v_generated     integer;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-b-f209@example.com', 'BE-F2-09 — usuário B fixture, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'test-b-f209@example.com');

  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth_key)
  VALUES (v_user_b, 'https://push.example.com/TEST_ENDPOINT_F209_B', 'p256dh_b', 'auth_b')
  RETURNING id INTO v_sub_b;

  -- ===================== Assume identidade de A (RLS real) =====================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  -- ===================== CASO A — push_subscriptions =====================

  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth_key, user_agent)
  VALUES (v_user_a, 'https://push.example.com/TEST_ENDPOINT_F209_A', 'p256dh_a', 'auth_a', 'TEST_UA')
  RETURNING id INTO v_sub_a;

  PERFORM 1 FROM public.push_subscriptions WHERE id = v_sub_a;
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A1 FALHOU: A deveria conseguir ler a própria inscrição de push';
  END IF;

  SELECT count(*) INTO v_count FROM public.push_subscriptions WHERE id = v_sub_b;
  IF v_count <> 0 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A2 FALHOU: A não deveria enxergar a inscrição de push de B';
  END IF;

  -- ===================== CASO B — notifications =====================

  v_blocked := false;
  BEGIN
    INSERT INTO public.notifications (user_id, type, message)
    VALUES (v_user_a, 'budget_alert', 'TEST_NOTIF_F209_DIRECT_INSERT');
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO B1 FALHOU: client não deveria conseguir INSERT direto em notifications (só notify_user, SECURITY DEFINER)';
  END IF;

  RESET ROLE;

  -- ===================== CASO C — notify_user() persiste corretamente =====================

  SELECT public.notify_user(v_user_a, 'fixed_bill_due', 'TEST_NOTIF_F209_DIRECT', 'fixed_bill', null)
  INTO v_notif_id;

  PERFORM 1 FROM public.notifications
  WHERE id = v_notif_id AND user_id = v_user_a AND type = 'fixed_bill_due' AND message = 'TEST_NOTIF_F209_DIRECT' AND read_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO C1 FALHOU: notify_user deveria ter persistido a notificação com os campos corretos';
  END IF;

  -- AC2: A consegue ler e marcar como lida a própria notificação.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  PERFORM 1 FROM public.notifications WHERE id = v_notif_id;
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO C2 FALHOU (AC2): A deveria conseguir ler a própria notificação (histórico no app)';
  END IF;

  UPDATE public.notifications SET read_at = now() WHERE id = v_notif_id;
  PERFORM 1 FROM public.notifications WHERE id = v_notif_id AND read_at IS NOT NULL;
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO C3 FALHOU: A deveria conseguir marcar a própria notificação como lida';
  END IF;

  -- Isolamento cross-user: B não enxerga notificação de A.
  SELECT count(*) INTO v_count FROM public.notifications WHERE id = v_notif_id;
  RESET ROLE;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_b::text, 'app_email_mfa_verified', 'true')::text,
    true);
  SELECT count(*) INTO v_count FROM public.notifications WHERE id = v_notif_id;
  IF v_count <> 0 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO C4 FALHOU: B não deveria enxergar notificação de A';
  END IF;
  RESET ROLE;

  -- ===================== CASO D — check_budget_alerts (RF-MVP-07/RN-04) =====================

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_F209_A', 'checking', 'BRL', 1000000) RETURNING id INTO v_acc_a;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_F209_A', 'expense', false) RETURNING id INTO v_cat_a;
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_a, v_acc_a, 'pix', 'TEST_PM_F209_A') RETURNING id INTO v_pm_a;
  INSERT INTO public.budget (user_id, category_id, month, limit_cents, alert_threshold_pct)
  VALUES (v_user_a, v_cat_a, v_month_start, 10000, 80)
  RETURNING id INTO v_budget_id;

  -- 85% do teto -> warning.
  INSERT INTO public.transactions (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_a, v_acc_a, v_pm_a, v_cat_a, 'expense', 8500, current_date);

  RESET ROLE;

  SELECT public.check_budget_alerts() INTO v_generated;
  IF v_generated < 1 THEN
    RAISE EXCEPTION 'CASO D1 FALHOU: check_budget_alerts deveria ter disparado ao menos 1 notificação (warning, 85%% >= 80%%)';
  END IF;

  PERFORM 1 FROM public.notifications
  WHERE user_id = v_user_a AND type = 'budget_alert' AND related_entity_type = 'budget_warning' AND related_entity_id = v_budget_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO D2 FALHOU: deveria existir notificação budget_warning para o orçamento de teste';
  END IF;

  -- Dedup: rodar de novo no mesmo nível não duplica.
  SELECT count(*) INTO v_count FROM public.notifications
  WHERE related_entity_type = 'budget_warning' AND related_entity_id = v_budget_id;
  PERFORM public.check_budget_alerts();
  DECLARE
    v_count2 integer;
  BEGIN
    SELECT count(*) INTO v_count2 FROM public.notifications
    WHERE related_entity_type = 'budget_warning' AND related_entity_id = v_budget_id;
    IF v_count2 <> v_count THEN
      RAISE EXCEPTION 'CASO D3 FALHOU (dedup): 2ª chamada no mesmo nível (warning) não deveria duplicar notificação, esperado %, obtido %', v_count, v_count2;
    END IF;
  END;

  -- Escala pra exceeded (>100%) -> nova notificação, NÍVEL diferente.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);
  INSERT INTO public.transactions (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_a, v_acc_a, v_pm_a, v_cat_a, 'expense', 2000, current_date); -- total 10500 > 10000 (limite)
  RESET ROLE;

  PERFORM public.check_budget_alerts();
  PERFORM 1 FROM public.notifications
  WHERE user_id = v_user_a AND type = 'budget_alert' AND related_entity_type = 'budget_exceeded' AND related_entity_id = v_budget_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO D4 FALHOU: ao escalar pra estouro (>100%%), deveria existir notificação budget_exceeded distinta da warning';
  END IF;

  RAISE NOTICE 'BE-F2-09 (push_subscriptions, notifications, notify_user, check_budget_alerts com dedup e escalonamento): TODOS PASSARAM';
END;
$test$;

SELECT 'BE-F2-09 notifications: PASS' AS result;

ROLLBACK;
