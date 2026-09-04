-- BE-F2-07 — Aviso de conta fixa a vencer (RN-05) + "vencida" derivável
-- (RF-F2-07 AC1-2).
--
-- Prova, via RLS real (SET LOCAL ROLE authenticated + request.jwt.claims,
-- nunca como owner/postgres — mesmo padrão de BE-M-13/BE-F2-01 a 06/09):
--   (A) fn_clear_due_transactions NÃO promove lançamento de conta fixa
--       pending->cleared automaticamente (preserva "vencida" distinta de
--       "paga"), mas CONTINUA promovendo lançamento comum normalmente
--       (regressão do comportamento herdado, F1-BE-09);
--   (B) get_fixed_bills_status deriva is_overdue corretamente (pending +
--       data passada = vencida; cleared = nunca vencida, mesmo com data
--       passada);
--   (C) check_fixed_bill_due_alerts (RN-05/AC1): dispara quando faltam
--       <= alert_days_before dias e ainda não paga; NÃO dispara se a data
--       de vencimento está fora da janela, nem se já foi paga adiantado;
--       dedup (1x por conta fixa/competência).
--
-- Simula "vencida" sem esperar o tempo passar de verdade: insere o
-- lançamento com transaction_date FUTURA (nasce 'pending', respeitando o
-- trigger existente) e depois move transaction_date pro passado via UPDATE —
-- status não é recalculado no UPDATE (achado de BE-F2-06), então continua
-- 'pending' mesmo com data passada, exatamente como aconteceria com o tempo
-- real passando sem ninguém marcar como paga.
--
-- Execução: supabase db query --linked --file supabase/tests/be_f2_07_fixed_bill_due_alerts.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_a         uuid;
  v_acc_a          uuid;
  v_cat_a          uuid;
  v_pm_a           uuid;
  v_bill_soon      uuid;
  v_bill_far       uuid;
  v_bill_paid      uuid;
  v_bill_overdue   uuid;
  v_txn_regular    uuid;
  v_txn_overdue    uuid;
  v_status_row     record;
  v_count          integer;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_F207_A', 'checking', 'BRL', 100000) RETURNING id INTO v_acc_a;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_F207_A', 'expense', false) RETURNING id INTO v_cat_a;
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_a, v_acc_a, 'pix', 'TEST_PM_F207_A') RETURNING id INTO v_pm_a;

  -- ===================== CASO A/B — vencida (fn_clear_due_transactions + get_fixed_bills_status) =====================

  INSERT INTO public.fixed_bills
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, due_day, start_date)
  VALUES (v_user_a, 'TEST_BILL_F207_OVERDUE', 15000, v_cat_a, v_acc_a, v_pm_a, 10, (date_trunc('month', current_date) - interval '3 months')::date)
  RETURNING id INTO v_bill_overdue;

  -- Nasce 'pending' (data futura) — respeita o trigger já existente.
  INSERT INTO public.transactions (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date, fixed_bill_id)
  VALUES (v_user_a, v_acc_a, v_pm_a, v_cat_a, 'expense', 15000, current_date + 5, v_bill_overdue)
  RETURNING id INTO v_txn_overdue;
  PERFORM 1 FROM public.transactions WHERE id = v_txn_overdue AND status = 'pending';
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'FIXTURE: lançamento com data futura deveria nascer pending';
  END IF;

  -- Simula o vencimento já ter passado sem pagamento (move a data, status
  -- não é recalculado no UPDATE — mesmo achado de BE-F2-06).
  UPDATE public.transactions SET transaction_date = current_date - 2 WHERE id = v_txn_overdue;

  -- Lançamento COMUM (sem fixed_bill_id) também vencido, pra comparação de
  -- regressão — este SIM deve continuar sendo promovido automaticamente.
  INSERT INTO public.transactions (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_a, v_acc_a, v_pm_a, v_cat_a, 'expense', 5000, current_date + 5)
  RETURNING id INTO v_txn_regular;
  UPDATE public.transactions SET transaction_date = current_date - 2 WHERE id = v_txn_regular;

  RESET ROLE;

  -- fn_clear_due_transactions roda SECURITY DEFINER, global, mesma forma que
  -- o pg_cron chama a cada 15min.
  PERFORM public.fn_clear_due_transactions();

  PERFORM 1 FROM public.transactions WHERE id = v_txn_overdue AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO A1 FALHOU: lançamento de conta fixa vencido NÃO deveria ser promovido automaticamente pra cleared (preserva "vencida")';
  END IF;

  PERFORM 1 FROM public.transactions WHERE id = v_txn_regular AND status = 'cleared';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO A2 FALHOU (regressão): lançamento COMUM vencido deveria continuar sendo promovido automaticamente pra cleared (F1-BE-09)';
  END IF;

  -- get_fixed_bills_status deriva is_overdue corretamente.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  SELECT * INTO v_status_row FROM public.get_fixed_bills_status() WHERE fixed_bill_id = v_bill_overdue;
  IF v_status_row IS NULL OR v_status_row.is_overdue IS NOT TRUE THEN
    RESET ROLE; RAISE EXCEPTION 'CASO B1 FALHOU (AC2): get_fixed_bills_status deveria sinalizar is_overdue=true (pending + data passada)';
  END IF;

  -- Marcar como paga (AC2 de BE-F2-06) faz is_overdue voltar a false, mesmo
  -- com a data no passado.
  UPDATE public.transactions SET status = 'cleared' WHERE id = v_txn_overdue;
  SELECT * INTO v_status_row FROM public.get_fixed_bills_status() WHERE fixed_bill_id = v_bill_overdue;
  IF v_status_row.is_overdue IS NOT FALSE THEN
    RESET ROLE; RAISE EXCEPTION 'CASO B2 FALHOU: conta fixa marcada como paga não deveria mais aparecer como vencida, mesmo com data passada';
  END IF;
  RESET ROLE;

  -- ===================== CASO C — aviso (RN-05/AC1) =====================

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  -- Vence em 2 dias, dentro da janela padrão (alert_days_before=3) — deveria avisar.
  INSERT INTO public.fixed_bills
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, due_day, start_date)
  VALUES (v_user_a, 'TEST_BILL_F207_SOON', 20000, v_cat_a, v_acc_a, v_pm_a, 10, date_trunc('month', current_date)::date)
  RETURNING id INTO v_bill_soon;
  INSERT INTO public.transactions (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date, fixed_bill_id)
  VALUES (v_user_a, v_acc_a, v_pm_a, v_cat_a, 'expense', 20000, current_date + 2, v_bill_soon);

  -- Vence em 10 dias, fora da janela — NÃO deveria avisar ainda.
  INSERT INTO public.fixed_bills
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, due_day, start_date)
  VALUES (v_user_a, 'TEST_BILL_F207_FAR', 30000, v_cat_a, v_acc_a, v_pm_a, 10, date_trunc('month', current_date)::date)
  RETURNING id INTO v_bill_far;
  INSERT INTO public.transactions (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date, fixed_bill_id)
  VALUES (v_user_a, v_acc_a, v_pm_a, v_cat_a, 'expense', 30000, current_date + 10, v_bill_far);

  -- Vence em 1 dia, mas já paga adiantado — NÃO deveria avisar.
  INSERT INTO public.fixed_bills
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, due_day, start_date)
  VALUES (v_user_a, 'TEST_BILL_F207_PAID', 12000, v_cat_a, v_acc_a, v_pm_a, 10, date_trunc('month', current_date)::date)
  RETURNING id INTO v_bill_paid;
  DECLARE
    v_txn_paid uuid;
  BEGIN
    INSERT INTO public.transactions (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date, fixed_bill_id)
    VALUES (v_user_a, v_acc_a, v_pm_a, v_cat_a, 'expense', 12000, current_date + 1, v_bill_paid)
    RETURNING id INTO v_txn_paid;
    UPDATE public.transactions SET status = 'cleared' WHERE id = v_txn_paid;
  END;

  RESET ROLE;

  PERFORM public.check_fixed_bill_due_alerts();

  PERFORM 1 FROM public.notifications
  WHERE type = 'fixed_bill_due' AND related_entity_type = 'fixed_bill' AND related_entity_id = v_bill_soon;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO C1 FALHOU (RN-05/AC1): conta fixa vencendo em 2 dias (dentro da janela de 3) deveria ter disparado aviso';
  END IF;

  PERFORM 1 FROM public.notifications
  WHERE type = 'fixed_bill_due' AND related_entity_type = 'fixed_bill' AND related_entity_id = v_bill_far;
  IF FOUND THEN
    RAISE EXCEPTION 'CASO C2 FALHOU: conta fixa vencendo em 10 dias (fora da janela) não deveria ter disparado aviso ainda';
  END IF;

  PERFORM 1 FROM public.notifications
  WHERE type = 'fixed_bill_due' AND related_entity_type = 'fixed_bill' AND related_entity_id = v_bill_paid;
  IF FOUND THEN
    RAISE EXCEPTION 'CASO C3 FALHOU: conta fixa já paga adiantado não deveria disparar aviso';
  END IF;

  -- Dedup: 2ª chamada não duplica o aviso já disparado.
  SELECT count(*) INTO v_count FROM public.notifications
  WHERE type = 'fixed_bill_due' AND related_entity_type = 'fixed_bill' AND related_entity_id = v_bill_soon;
  PERFORM public.check_fixed_bill_due_alerts();
  DECLARE
    v_count2 integer;
  BEGIN
    SELECT count(*) INTO v_count2 FROM public.notifications
    WHERE type = 'fixed_bill_due' AND related_entity_type = 'fixed_bill' AND related_entity_id = v_bill_soon;
    IF v_count2 <> v_count THEN
      RAISE EXCEPTION 'CASO C4 FALHOU (dedup): 2ª chamada não deveria duplicar o aviso, esperado %, obtido %', v_count, v_count2;
    END IF;
  END;

  RAISE NOTICE 'BE-F2-07 (vencida derivável, exclusão de fn_clear_due_transactions com regressão, aviso RN-05 com janela/paga-adiantado/dedup): TODOS PASSARAM';
END;
$test$;

SELECT 'BE-F2-07 fixed_bill_due_alerts: PASS' AS result;

ROLLBACK;
