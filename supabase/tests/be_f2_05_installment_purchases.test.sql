-- BE-F2-05 — Modelo de dados de parcelamento + geração de 1 parcela por
-- fatura até quitação (RF-F2-04 AC1-2, RN-07).
--
-- Prova, via RLS real (SET LOCAL ROLE authenticated + request.jwt.claims,
-- nunca como owner/postgres — mesmo padrão de BE-M-13/BE-F2-01/02/03/04):
--   (A) installment_amount_for — função pura, resto absorvido pela última
--       parcela (soma exata = total);
--   (B) payment_method_id precisa ser type=credit_card (RF-F2-04);
--   (C) geração ponta a ponta: catch-up de múltiplas parcelas atrasadas no
--       mesmo run (plano com compra de 3 meses atrás), parcela ainda não
--       devida NÃO é gerada, get_installment_purchases_progress reflete
--       exatamente o que foi gerado (AC2);
--   (D) trava de campos após a 1ª parcela gerada (total/count/purchase_date/
--       payment_method_id imutáveis; description/category_id/account_id
--       seguem editáveis);
--   (E) RN-07: excluir o plano não apaga as parcelas já geradas, só desfaz o
--       vínculo;
--   (F) isolamento cross-user + IDOR.
--
-- closing_day=31 (sempre clampado ao último dia do mês) é usado em todos os
-- cartões deste teste de propósito — garante current_competencia = mês
-- corrente determinístico, independente de em que dia do mês este teste roda.
--
-- Execução: supabase db query --linked --file supabase/tests/be_f2_05_installment_purchases.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
BEGIN
  IF public.installment_amount_for(10000, 3::smallint, 1::smallint) <> 3333 THEN
    RAISE EXCEPTION 'CASO A1 FALHOU: 1ª parcela de 10000/3 deveria ser 3333';
  END IF;
  IF public.installment_amount_for(10000, 3::smallint, 2::smallint) <> 3333 THEN
    RAISE EXCEPTION 'CASO A2 FALHOU: 2ª parcela de 10000/3 deveria ser 3333';
  END IF;
  IF public.installment_amount_for(10000, 3::smallint, 3::smallint) <> 3334 THEN
    RAISE EXCEPTION 'CASO A3 FALHOU: última parcela de 10000/3 deveria absorver o resto (3334)';
  END IF;
  IF public.installment_amount_for(10000, 3::smallint, 1::smallint)
     + public.installment_amount_for(10000, 3::smallint, 2::smallint)
     + public.installment_amount_for(10000, 3::smallint, 3::smallint) <> 10000 THEN
    RAISE EXCEPTION 'CASO A4 FALHOU: soma das 3 parcelas deveria ser exatamente 10000';
  END IF;

  RAISE NOTICE 'BE-F2-05 CASO A (installment_amount_for): TODOS PASSARAM';
END;
$test$;

DO $test$
DECLARE
  v_user_a       uuid;
  v_user_b       uuid := gen_random_uuid();
  v_acc_a        uuid;
  v_cat_a        uuid;
  v_pm_pix_a     uuid;
  v_card_a       uuid;
  v_pm_card_a    uuid;
  v_ip_b         uuid;
  v_cat_b        uuid;
  v_acc_b        uuid;
  v_card_b       uuid;
  v_pm_card_b    uuid;
  v_month_start  date := date_trunc('month', current_date)::date;
  v_ip_simple    uuid; -- geração simples (1 de 2)
  v_ip_catchup   uuid; -- catch-up de várias parcelas atrasadas
  v_ip_lock      uuid; -- trava de campos após 1ª geração
  v_ip_rn07      uuid; -- RN-07
  v_txn_id       uuid;
  v_blocked      boolean;
  v_count        integer;
  v_progress     record;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-b-f205@example.com', 'BE-F2-05 — usuário B fixture, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'test-b-f205@example.com');

  -- Fixture de B (como postgres) — 1 cartão + 1 plano, só para isolamento/IDOR.
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_b, 'TEST_ACC_F205_B', 'checking', 'BRL', 1000) RETURNING id INTO v_acc_b;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_b, 'TEST_CAT_F205_B', 'expense', false) RETURNING id INTO v_cat_b;
  INSERT INTO public.credit_cards (user_id, name, limit_cents, closing_day, due_day)
  VALUES (v_user_b, 'TEST_CARD_F205_B', 500000, 31, 10) RETURNING id INTO v_card_b;
  SELECT id INTO v_pm_card_b FROM public.payment_methods WHERE credit_card_id = v_card_b AND type = 'credit_card';
  INSERT INTO public.installment_purchases
    (user_id, description, total_amount_cents, installments_count, category_id, account_id, payment_method_id, purchase_date)
  VALUES (v_user_b, 'TEST_IP_F205_B', 6000, 3, v_cat_b, v_acc_b, v_pm_card_b, v_month_start)
  RETURNING id INTO v_ip_b;

  -- ===================== Assume identidade de A (RLS real) =====================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_F205_A', 'checking', 'BRL', 100000) RETURNING id INTO v_acc_a;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_F205_A', 'expense', false) RETURNING id INTO v_cat_a;
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_a, v_acc_a, 'pix', 'TEST_PM_PIX_F205_A') RETURNING id INTO v_pm_pix_a;
  INSERT INTO public.credit_cards (user_id, name, limit_cents, closing_day, due_day)
  VALUES (v_user_a, 'TEST_CARD_F205_A', 1000000, 31, 10) RETURNING id INTO v_card_a;
  SELECT id INTO v_pm_card_a FROM public.payment_methods WHERE credit_card_id = v_card_a AND type = 'credit_card';

  -- ===================== CASO B — exige forma de pagamento tipo cartão =====================

  v_blocked := false;
  BEGIN
    INSERT INTO public.installment_purchases
      (user_id, description, total_amount_cents, installments_count, category_id, account_id, payment_method_id, purchase_date)
    VALUES (v_user_a, 'TEST_IP_F205_BAD_PM', 9000, 3, v_cat_a, v_acc_a, v_pm_pix_a, v_month_start);
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO B1 FALHOU: installment_purchases com payment_method_id não-cartão deveria ser rejeitado';
  END IF;

  -- ===================== CASO F (parte 1) — IDOR na criação do plano =====================

  v_blocked := false;
  BEGIN
    INSERT INTO public.installment_purchases
      (user_id, description, total_amount_cents, installments_count, category_id, account_id, payment_method_id, purchase_date)
    VALUES (v_user_a, 'TEST_IP_F205_IDOR', 9000, 3, v_cat_b, v_acc_a, v_pm_card_a, v_month_start);
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO F1 FALHOU (IDOR): A não deveria conseguir criar plano referenciando category_id de B';
  END IF;

  -- ===================== CASO C — geração simples (1 de 2) =====================

  INSERT INTO public.installment_purchases
    (user_id, description, total_amount_cents, installments_count, category_id, account_id, payment_method_id, purchase_date)
  VALUES (v_user_a, 'TEST_IP_F205_SIMPLE', 20000, 2, v_cat_a, v_acc_a, v_pm_card_a, v_month_start)
  RETURNING id INTO v_ip_simple;

  -- ===================== CASO C (catch-up) — compra de 3 meses atrás, 5 parcelas =====================

  INSERT INTO public.installment_purchases
    (user_id, description, total_amount_cents, installments_count, category_id, account_id, payment_method_id, purchase_date)
  VALUES (v_user_a, 'TEST_IP_F205_CATCHUP', 50000, 5, v_cat_a, v_acc_a, v_pm_card_a, (v_month_start - interval '3 months')::date)
  RETURNING id INTO v_ip_catchup;

  RESET ROLE;

  -- generate_installment_transactions roda SECURITY DEFINER (job global),
  -- fora do contexto RLS de A de propósito — mesma forma que o pg_cron chama.
  PERFORM public.generate_installment_transactions();

  -- Plano simples: 1ª parcela gerada, 2ª ainda não (mês seguinte).
  SELECT count(*) INTO v_count FROM public.transactions WHERE installment_plan_id = v_ip_simple;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'CASO C1 FALHOU: plano simples deveria ter gerado exatamente 1 parcela (de 2), obtido %', v_count;
  END IF;
  PERFORM 1 FROM public.transactions WHERE installment_plan_id = v_ip_simple AND installment_number = 1 AND amount_cents = 10000;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO C2 FALHOU: parcela 1/2 de 20000 deveria valer 10000';
  END IF;

  -- Plano catch-up: compra de 3 meses atrás, 5 parcelas -> competências
  -- alvo (mês-3, mês-2, mês-1, mês, mês+1); só as 4 primeiras já chegaram.
  SELECT count(*) INTO v_count FROM public.transactions WHERE installment_plan_id = v_ip_catchup;
  IF v_count <> 4 THEN
    RAISE EXCEPTION 'CASO C3 FALHOU (catch-up): esperava 4 parcelas geradas num único run (mês-3 a mês corrente), obtido %', v_count;
  END IF;
  PERFORM 1 FROM public.transactions WHERE installment_plan_id = v_ip_catchup AND installment_number = 5;
  IF FOUND THEN
    RAISE EXCEPTION 'CASO C4 FALHOU: parcela 5/5 (competência mês+1, ainda não chegou) não deveria ter sido gerada';
  END IF;
  -- Parcela 1 datada na compra de fato; parcela 4 no 1º dia da própria competência.
  PERFORM 1 FROM public.transactions
  WHERE installment_plan_id = v_ip_catchup AND installment_number = 1
    AND transaction_date = (v_month_start - interval '3 months')::date;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO C5 FALHOU: parcela 1 deveria estar datada na data real da compra';
  END IF;
  PERFORM 1 FROM public.transactions
  WHERE installment_plan_id = v_ip_catchup AND installment_number = 4
    AND transaction_date = v_month_start;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO C6 FALHOU: parcela 4 (competência do mês corrente) deveria estar datada no 1º dia deste mês';
  END IF;

  -- Idempotência: rodar de novo não duplica nem antecipa a parcela 5.
  PERFORM public.generate_installment_transactions();
  SELECT count(*) INTO v_count FROM public.transactions WHERE installment_plan_id = v_ip_catchup;
  IF v_count <> 4 THEN
    RAISE EXCEPTION 'CASO C7 FALHOU: 2ª chamada não deveria gerar/duplicar nada (ainda 4), obtido %', v_count;
  END IF;

  -- AC2 — progresso "X de N", como A.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  SELECT * INTO v_progress FROM public.get_installment_purchases_progress() WHERE installment_purchase_id = v_ip_catchup;
  IF v_progress IS NULL OR v_progress.generated_count <> 4 OR v_progress.remaining_count <> 1 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO C8 FALHOU (AC2): progresso deveria ser 4 geradas / 1 restante, obtido %/%', v_progress.generated_count, v_progress.remaining_count;
  END IF;

  -- A não enxerga o plano de B via progresso.
  PERFORM 1 FROM public.get_installment_purchases_progress() WHERE installment_purchase_id = v_ip_b;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO F2 FALHOU: get_installment_purchases_progress não deveria expor o plano de B para A';
  END IF;

  -- ===================== CASO D — trava de campos após 1ª geração =====================

  SELECT id INTO v_txn_id FROM public.transactions WHERE installment_plan_id = v_ip_simple AND installment_number = 1;

  v_blocked := false;
  BEGIN
    UPDATE public.installment_purchases SET total_amount_cents = 99999 WHERE id = v_ip_simple;
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO D1 FALHOU: total_amount_cents não deveria ser editável após a 1ª parcela já gerada';
  END IF;

  UPDATE public.installment_purchases SET description = 'TEST_IP_F205_SIMPLE_EDITED' WHERE id = v_ip_simple;
  PERFORM 1 FROM public.installment_purchases WHERE id = v_ip_simple AND description = 'TEST_IP_F205_SIMPLE_EDITED' AND total_amount_cents = 20000;
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO D2 FALHOU: description deveria continuar editável, total_amount_cents deveria seguir 20000';
  END IF;

  -- Plano sem nenhuma parcela ainda gerada: total/count seguem 100% editáveis.
  INSERT INTO public.installment_purchases
    (user_id, description, total_amount_cents, installments_count, category_id, account_id, payment_method_id, purchase_date)
  VALUES (v_user_a, 'TEST_IP_F205_LOCK', 5000, 4, v_cat_a, v_acc_a, v_pm_card_a, (v_month_start + interval '2 months')::date)
  RETURNING id INTO v_ip_lock;
  UPDATE public.installment_purchases SET total_amount_cents = 8000 WHERE id = v_ip_lock;
  PERFORM 1 FROM public.installment_purchases WHERE id = v_ip_lock AND total_amount_cents = 8000;
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO D3 FALHOU: plano sem parcela gerada ainda deveria aceitar UPDATE de total_amount_cents';
  END IF;

  -- ===================== CASO E — RN-07 (DELETE não apaga parcela) =====================

  DELETE FROM public.installment_purchases WHERE id = v_ip_simple;
  RESET ROLE;

  PERFORM 1 FROM public.transactions WHERE id = v_txn_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO E1 FALHOU (RN-07): excluir o plano não deveria apagar a parcela já gerada';
  END IF;
  PERFORM 1 FROM public.transactions WHERE id = v_txn_id AND installment_plan_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO E2 FALHOU: installment_plan_id da parcela preservada deveria virar NULL (ON DELETE SET NULL)';
  END IF;

  RAISE NOTICE 'BE-F2-05 CASOS B-F (forma de pagamento, geração/catch-up, progresso, trava de campos, RN-07, isolamento/IDOR): TODOS PASSARAM';
END;
$test$;

SELECT 'BE-F2-05 installment_purchases: PASS' AS result;

ROLLBACK;
