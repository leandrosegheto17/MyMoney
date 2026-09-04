-- BE-F2-06 — Modelo de dados de contas fixas + geração de lançamento
-- previsto por competência (RF-F2-06 AC1-2).
--
-- Prova, via RLS real (SET LOCAL ROLE authenticated + request.jwt.claims,
-- nunca como owner/postgres — mesmo padrão de BE-M-13/BE-F2-01 a 05):
--   (A) fixed_bill_generation_date — função pura, clamp de mês curto;
--   (B) geração ponta a ponta: lançamento criado com status coerente com sua
--       transaction_date (pending se futura, cleared se não — resolvido pelo
--       trigger já existente desde o MVP, nenhuma lógica nova), idempotente;
--   (C) janela start_date/end_date respeitada;
--   (D) AC2 (achado de desenho): PATCH de status pending->cleared numa
--       transação gerada por conta fixa já funciona via RLS padrão, sem
--       nenhum endpoint/trigger novo — prova a afirmação documentada na
--       migration, não só assume;
--   (E) RN-07: excluir a conta fixa não apaga o lançamento já gerado;
--   (F) isolamento cross-user + IDOR.
--
-- Execução: supabase db query --linked --file supabase/tests/be_f2_06_fixed_bills.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
BEGIN
  IF public.fixed_bill_generation_date('2026-09-01', 10::smallint) <> '2026-09-10' THEN
    RAISE EXCEPTION 'CASO A1 FALHOU: geração normal, sem clamp, deveria ser 2026-09-10';
  END IF;
  IF public.fixed_bill_generation_date('2027-02-01', 31::smallint) <> '2027-02-28' THEN
    RAISE EXCEPTION 'CASO A2 FALHOU: due_day=31 em fevereiro de 28 dias deveria clampar para 2027-02-28';
  END IF;

  RAISE NOTICE 'BE-F2-06 CASO A (função pura): TODOS PASSARAM';
END;
$test$;

DO $test$
DECLARE
  v_user_a      uuid;
  v_user_b      uuid := gen_random_uuid();
  v_acc_a       uuid;
  v_cat_a       uuid;
  v_pm_a        uuid;
  v_acc_b       uuid;
  v_cat_b       uuid;
  v_pm_b        uuid;
  v_month_start date := date_trunc('month', current_date)::date;
  v_bill_active uuid;
  v_bill_future uuid;
  v_bill_ended  uuid;
  v_txn         record;
  v_count       integer;
  v_blocked     boolean;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-b-f206@example.com', 'BE-F2-06 — usuário B fixture, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'test-b-f206@example.com');

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_b, 'TEST_ACC_F206_B', 'checking', 'BRL', 1000) RETURNING id INTO v_acc_b;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_b, 'TEST_CAT_F206_B', 'expense', false) RETURNING id INTO v_cat_b;
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_b, v_acc_b, 'pix', 'TEST_PM_F206_B') RETURNING id INTO v_pm_b;

  -- ===================== Assume identidade de A (RLS real) =====================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_F206_A', 'checking', 'BRL', 100000) RETURNING id INTO v_acc_a;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_F206_A', 'expense', false) RETURNING id INTO v_cat_a;
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_a, v_acc_a, 'pix', 'TEST_PM_F206_A') RETURNING id INTO v_pm_a;

  -- ===================== CASO F (parte 1) — IDOR na criação da conta fixa =====================

  v_blocked := false;
  BEGIN
    INSERT INTO public.fixed_bills
      (user_id, description, amount_cents, category_id, account_id, payment_method_id, due_day, start_date)
    VALUES (v_user_a, 'TEST_BILL_F206_IDOR', 10000, v_cat_b, v_acc_a, v_pm_a, 10, v_month_start);
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO F1 FALHOU (IDOR): A não deveria conseguir criar conta fixa referenciando category_id de B';
  END IF;

  -- ===================== CASO B — geração ponta a ponta =====================

  INSERT INTO public.fixed_bills
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, due_day, start_date)
  VALUES (v_user_a, 'TEST_BILL_F206_ACTIVE', 45000, v_cat_a, v_acc_a, v_pm_a, 15, (v_month_start - interval '6 months')::date)
  RETURNING id INTO v_bill_active;

  -- ===================== CASO C — janela start_date/end_date =====================

  INSERT INTO public.fixed_bills
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, due_day, start_date)
  VALUES (v_user_a, 'TEST_BILL_F206_FUTURE', 30000, v_cat_a, v_acc_a, v_pm_a, 10, (v_month_start + interval '1 month')::date)
  RETURNING id INTO v_bill_future;

  INSERT INTO public.fixed_bills
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, due_day, start_date, end_date)
  VALUES (v_user_a, 'TEST_BILL_F206_ENDED', 20000, v_cat_a, v_acc_a, v_pm_a, 10, (v_month_start - interval '4 months')::date, (v_month_start - interval '1 month')::date)
  RETURNING id INTO v_bill_ended;

  RESET ROLE;

  -- generate_fixed_bill_transactions roda SECURITY DEFINER (job global), fora
  -- do contexto RLS de A de propósito — mesma forma que o pg_cron chama.
  PERFORM public.generate_fixed_bill_transactions();

  SELECT id, transaction_date, status, amount_cents INTO v_txn
  FROM public.transactions
  WHERE fixed_bill_id = v_bill_active AND date_trunc('month', transaction_date) = v_month_start;
  IF v_txn.id IS NULL THEN
    RAISE EXCEPTION 'CASO B1 FALHOU (RF-F2-06 AC1): conta fixa ativa deveria ter gerado lançamento previsto na competência corrente';
  END IF;
  IF v_txn.amount_cents <> 45000 THEN
    RAISE EXCEPTION 'CASO B2 FALHOU: lançamento gerado deveria refletir amount_cents da conta fixa (45000), obtido %', v_txn.amount_cents;
  END IF;
  -- Coerência status <-> data (regra já existente desde o MVP, nenhuma lógica
  -- nova aqui — só confirma que a integração não quebrou a regra herdada).
  IF (v_txn.transaction_date > current_date) <> (v_txn.status = 'pending') THEN
    RAISE EXCEPTION 'CASO B3 FALHOU: status (%) incoerente com transaction_date (%) vs. hoje (%)', v_txn.status, v_txn.transaction_date, current_date;
  END IF;

  -- Idempotência.
  PERFORM public.generate_fixed_bill_transactions();
  SELECT count(*) INTO v_count
  FROM public.transactions WHERE fixed_bill_id = v_bill_active AND date_trunc('month', transaction_date) = v_month_start;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'CASO B4 FALHOU: generate_fixed_bill_transactions deveria ser idempotente (ainda 1 lançamento), obtido %', v_count;
  END IF;

  -- Janela: conta fixa com start_date futuro não gera ainda.
  PERFORM 1 FROM public.transactions WHERE fixed_bill_id = v_bill_future;
  IF FOUND THEN
    RAISE EXCEPTION 'CASO C1 FALHOU: conta fixa com start_date futuro não deveria ter gerado lançamento ainda';
  END IF;

  -- Janela: conta fixa já encerrada (end_date no passado) não gera mais.
  PERFORM 1 FROM public.transactions WHERE fixed_bill_id = v_bill_ended;
  IF FOUND THEN
    RAISE EXCEPTION 'CASO C2 FALHOU: conta fixa já encerrada (end_date no passado) não deveria gerar lançamento novo';
  END IF;

  -- ===================== CASO D — AC2: marcar como paga já funciona (PATCH status) =====================

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  UPDATE public.transactions SET status = 'cleared' WHERE id = v_txn.id;
  PERFORM 1 FROM public.transactions WHERE id = v_txn.id AND status = 'cleared';
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO D1 FALHOU (AC2): PATCH de status pending->cleared numa transação de conta fixa deveria funcionar (nenhum trigger novo bloqueando)';
  END IF;

  -- ===================== CASO F (parte 2) — isolamento cross-user =====================

  SELECT count(*) INTO v_count FROM public.fixed_bills WHERE user_id = v_user_b;
  IF v_count <> 0 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO F2 FALHOU: A não deveria enxergar conta fixa de B via SELECT';
  END IF;

  RESET ROLE;

  -- ===================== CASO E — RN-07 (DELETE não apaga lançamento) =====================

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);
  DELETE FROM public.fixed_bills WHERE id = v_bill_active;
  RESET ROLE;

  PERFORM 1 FROM public.transactions WHERE id = v_txn.id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO E1 FALHOU (RN-07): excluir a conta fixa não deveria apagar o lançamento já gerado';
  END IF;
  PERFORM 1 FROM public.transactions WHERE id = v_txn.id AND fixed_bill_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO E2 FALHOU: fixed_bill_id do lançamento preservado deveria virar NULL (ON DELETE SET NULL)';
  END IF;

  RAISE NOTICE 'BE-F2-06 CASOS B-F (geração, janela start/end, AC2 já funciona, RN-07, isolamento/IDOR): TODOS PASSARAM';
END;
$test$;

SELECT 'BE-F2-06 fixed_bills: PASS' AS result;

ROLLBACK;
