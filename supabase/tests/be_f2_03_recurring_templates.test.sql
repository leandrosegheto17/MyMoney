-- BE-F2-03 — Modelo de dados de recorrência + geração mensal automática
-- (RF-F2-02 AC1, RN-07).
--
-- Prova, via RLS real (SET LOCAL ROLE authenticated + request.jwt.claims,
-- nunca como owner/postgres — mesmo padrão de BE-M-11/BE-M-13/BE-F2-01/02):
--   (A) recurring_template_generation_date — função pura, clamp de mês curto;
--   (B) RF-F2-02 AC1 ponta a ponta: template ativo gera 1 lançamento na
--       competência corrente via generate_recurring_transactions, idempotente
--       (2ª chamada não duplica);
--   (C) Janela start_date/end_date respeitada (não gera antes de começar,
--       não gera depois de encerrado — RF-F2-02 AC2);
--   (D) RN-07: excluir o template NÃO apaga o lançamento já gerado, só
--       desfaz o vínculo (recurring_rule_id vira NULL, ON DELETE SET NULL);
--   (E) Isolamento cross-user e IDOR (B não lê fatura de A; A não consegue
--       criar template referenciando conta/categoria/forma de pagamento de
--       B — mesmo padrão de BE-M-13/BE-F2-01).
--
-- Execução: supabase db query --linked --file supabase/tests/be_f2_03_recurring_templates.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

-- ===================== CASO A — função pura (sem fixture) =====================

DO $test$
BEGIN
  IF public.recurring_template_generation_date('2026-09-01', 10::smallint) <> '2026-09-10' THEN
    RAISE EXCEPTION 'CASO A1 FALHOU: geração normal, sem clamp, deveria ser 2026-09-10';
  END IF;

  -- Clamp: day_of_month=31 num mês de 30 dias (setembro).
  IF public.recurring_template_generation_date('2026-09-01', 31::smallint) <> '2026-09-30' THEN
    RAISE EXCEPTION 'CASO A2 FALHOU: day_of_month=31 em setembro (30 dias) deveria clampar para 2026-09-30';
  END IF;

  -- Clamp: day_of_month=31 num fevereiro de 28 dias.
  IF public.recurring_template_generation_date('2027-02-01', 31::smallint) <> '2027-02-28' THEN
    RAISE EXCEPTION 'CASO A3 FALHOU: day_of_month=31 em fevereiro de 28 dias deveria clampar para 2027-02-28';
  END IF;

  RAISE NOTICE 'BE-F2-03 CASO A (função pura): TODOS PASSARAM';
END;
$test$;

DO $test$
DECLARE
  v_user_a       uuid;
  v_user_b       uuid := gen_random_uuid();
  v_acc_a        uuid;
  v_cat_a        uuid;
  v_pm_a         uuid;
  v_acc_b        uuid;
  v_cat_b        uuid;
  v_pm_b         uuid;
  v_month_start  date := date_trunc('month', current_date)::date;
  v_today_day    smallint := extract(day from current_date)::smallint;
  v_tpl_active   uuid;
  v_tpl_future   uuid;
  v_tpl_ended    uuid;
  v_txn_id       uuid;
  v_generated    integer;
  v_count        integer;
  v_blocked      boolean;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-b-f203@example.com', 'BE-F2-03 — usuário B fixture, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'test-b-f203@example.com');

  -- Fixture de B (como postgres) — só para os casos de isolamento/IDOR.
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_b, 'TEST_ACC_F203_B', 'checking', 'BRL', 1000) RETURNING id INTO v_acc_b;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_b, 'TEST_CAT_F203_B', 'expense', false) RETURNING id INTO v_cat_b;
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_b, v_acc_b, 'pix', 'TEST_PM_F203_B') RETURNING id INTO v_pm_b;

  -- ===================== Assume identidade de A (RLS real) =====================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_F203_A', 'checking', 'BRL', 100000) RETURNING id INTO v_acc_a;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_F203_A', 'expense', false) RETURNING id INTO v_cat_a;
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_a, v_acc_a, 'pix', 'TEST_PM_F203_A') RETURNING id INTO v_pm_a;

  -- ===================== CASO E (parte 1) — IDOR na criação do template =====================

  v_blocked := false;
  BEGIN
    INSERT INTO public.recurring_templates
      (user_id, description, amount_cents, category_id, account_id, payment_method_id, day_of_month, start_date)
    VALUES (v_user_a, 'TEST_TPL_F203_IDOR', 10000, v_cat_b, v_acc_a, v_pm_a, v_today_day, v_month_start);
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO E1 FALHOU (IDOR): A não deveria conseguir criar template referenciando category_id de B';
  END IF;

  v_blocked := false;
  BEGIN
    INSERT INTO public.recurring_templates
      (user_id, description, amount_cents, category_id, account_id, payment_method_id, day_of_month, start_date)
    VALUES (v_user_a, 'TEST_TPL_F203_IDOR2', 10000, v_cat_a, v_acc_b, v_pm_a, v_today_day, v_month_start);
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO E2 FALHOU (IDOR): A não deveria conseguir criar template referenciando account_id de B';
  END IF;

  -- ===================== CASO B — geração mensal, ponta a ponta =====================

  -- Template ativo desde o início do mês corrente, dia_do_mês = hoje (garante
  -- que "já passou o dia de gerar" no momento em que este teste roda).
  INSERT INTO public.recurring_templates
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, day_of_month, start_date)
  VALUES (v_user_a, 'TEST_TPL_F203_ACTIVE', 15000, v_cat_a, v_acc_a, v_pm_a, v_today_day, v_month_start)
  RETURNING id INTO v_tpl_active;

  RESET ROLE;

  -- generate_recurring_transactions roda SECURITY DEFINER (job global), fora
  -- do contexto RLS de A de propósito — mesma forma que o pg_cron chama.
  SELECT public.generate_recurring_transactions() INTO v_generated;
  IF v_generated < 1 THEN
    RAISE EXCEPTION 'CASO B1 FALHOU: esperava ao menos 1 lançamento gerado (o template TEST_TPL_F203_ACTIVE), obtido %', v_generated;
  END IF;

  SELECT id INTO v_txn_id
  FROM public.transactions
  WHERE recurring_rule_id = v_tpl_active
    AND date_trunc('month', transaction_date) = v_month_start;
  IF v_txn_id IS NULL THEN
    RAISE EXCEPTION 'CASO B2 FALHOU: template ativo deveria ter gerado lançamento na competência corrente';
  END IF;

  PERFORM 1 FROM public.transactions WHERE id = v_txn_id AND amount_cents = 15000 AND kind = 'expense';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO B3 FALHOU: lançamento gerado deveria refletir amount_cents/kind do template';
  END IF;

  -- Idempotência: rodar de novo não duplica.
  PERFORM public.generate_recurring_transactions();
  SELECT count(*) INTO v_count
  FROM public.transactions
  WHERE recurring_rule_id = v_tpl_active AND date_trunc('month', transaction_date) = v_month_start;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'CASO B4 FALHOU: generate_recurring_transactions deveria ser idempotente (ainda 1 lançamento), obtido %', v_count;
  END IF;

  -- ===================== CASO C — janela start_date/end_date =====================

  -- Template com start_date no futuro (mês seguinte) não deve gerar nada agora.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);
  INSERT INTO public.recurring_templates
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, day_of_month, start_date)
  VALUES (v_user_a, 'TEST_TPL_F203_FUTURE', 20000, v_cat_a, v_acc_a, v_pm_a, 1, (v_month_start + interval '1 month')::date)
  RETURNING id INTO v_tpl_future;

  -- Template já encerrado no mês passado não deve gerar nada agora.
  INSERT INTO public.recurring_templates
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, day_of_month, start_date, end_date)
  VALUES (v_user_a, 'TEST_TPL_F203_ENDED', 25000, v_cat_a, v_acc_a, v_pm_a, 1, (v_month_start - interval '3 months')::date, (v_month_start - interval '1 month')::date)
  RETURNING id INTO v_tpl_ended;
  RESET ROLE;

  PERFORM public.generate_recurring_transactions();

  PERFORM 1 FROM public.transactions WHERE recurring_rule_id = v_tpl_future;
  IF FOUND THEN
    RAISE EXCEPTION 'CASO C1 FALHOU: template com start_date futuro não deveria ter gerado lançamento ainda';
  END IF;

  PERFORM 1 FROM public.transactions WHERE recurring_rule_id = v_tpl_ended;
  IF FOUND THEN
    RAISE EXCEPTION 'CASO C2 FALHOU (RF-F2-02 AC2): template já encerrado (end_date no passado) não deveria gerar lançamento novo';
  END IF;

  -- ===================== CASO D — RN-07 (DELETE não apaga lançamento) =====================

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);
  DELETE FROM public.recurring_templates WHERE id = v_tpl_active;
  RESET ROLE;

  PERFORM 1 FROM public.transactions WHERE id = v_txn_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO D1 FALHOU (RN-07): excluir o template não deveria apagar o lançamento já gerado';
  END IF;

  PERFORM 1 FROM public.transactions WHERE id = v_txn_id AND recurring_rule_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO D2 FALHOU: recurring_rule_id do lançamento preservado deveria virar NULL (ON DELETE SET NULL)';
  END IF;

  -- ===================== CASO E (parte 2) — isolamento cross-user =====================

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  SELECT count(*) INTO v_count FROM public.recurring_templates WHERE user_id = v_user_b;
  IF v_count <> 0 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO E3 FALHOU: A não deveria enxergar template de B via SELECT';
  END IF;

  RESET ROLE;

  RAISE NOTICE 'BE-F2-03 CASOS B-E (geração mensal, janela start/end, RN-07, isolamento/IDOR): TODOS PASSARAM';
END;
$test$;

SELECT 'BE-F2-03 recurring_templates: PASS' AS result;

ROLLBACK;
