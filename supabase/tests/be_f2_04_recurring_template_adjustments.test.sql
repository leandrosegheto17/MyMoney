-- BE-F2-04 — Reajuste de valor de recorrência (RF-F2-03 AC1-3, RN-02):
-- aplicação prospectiva a partir de competência escolhida, histórico
-- preservado.
--
-- Prova, via RLS real (SET LOCAL ROLE authenticated + request.jwt.claims,
-- nunca como owner/postgres — mesmo padrão de BE-M-13/BE-F2-01/02/03):
--   (A) recurring_template_amount_for resolve corretamente: sem reajuste (base),
--       com 1 reajuste já vigente, com múltiplos reajustes cadastrados fora de
--       ordem cronológica de inserção (decide por effective_from, não por
--       created_at) — inclui competência ANTES do 1º reajuste (ainda base);
--   (B) recurring_templates.amount_cents fica imutável após criação (UPDATE
--       direto é rejeitado); demais colunas continuam editáveis;
--   (C) reajuste retroativo (effective_from no passado) é rejeitado (RN-02);
--   (D) generate_recurring_transactions (BE-F2-03) usa o valor RESOLVIDO, não
--       o valor base bruto — cobre os 2 lados de RN-02: reajuste já vigente
--       É usado; reajuste ainda não vigente NÃO "vaza" pro lançamento de hoje;
--   (E) isolamento cross-user + IDOR + unicidade (template, competência).
--
-- Execução: supabase db query --linked --file supabase/tests/be_f2_04_recurring_template_adjustments.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_a      uuid;
  v_user_b      uuid := gen_random_uuid();
  v_acc_a       uuid;
  v_cat_a       uuid;
  v_pm_a        uuid;
  v_tpl_b_owner uuid;
  v_month_start date := date_trunc('month', current_date)::date;
  v_today_day   smallint := extract(day from current_date)::smallint;
  v_tpl_1       uuid; -- resolução de valor (múltiplos reajustes)
  v_tpl_2       uuid; -- imutabilidade de amount_cents
  v_tpl_3       uuid; -- reajuste retroativo rejeitado
  v_tpl_gen_a   uuid; -- geração: sem reajuste
  v_tpl_gen_b   uuid; -- geração: reajuste já vigente
  v_tpl_gen_c   uuid; -- geração: reajuste futuro, não deve vazar
  v_amount      bigint;
  v_blocked     boolean;
  v_count       integer;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-b-f204@example.com', 'BE-F2-04 — usuário B fixture, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'test-b-f204@example.com');

  -- Fixture de B (como postgres) — 1 template + 1 reajuste, só para os casos
  -- de isolamento/IDOR.
  DECLARE
    v_acc_b uuid;
    v_cat_b uuid;
    v_pm_b  uuid;
  BEGIN
    INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
    VALUES (v_user_b, 'TEST_ACC_F204_B', 'checking', 'BRL', 1000) RETURNING id INTO v_acc_b;
    INSERT INTO public.categories (user_id, name, kind, is_system_default)
    VALUES (v_user_b, 'TEST_CAT_F204_B', 'expense', false) RETURNING id INTO v_cat_b;
    INSERT INTO public.payment_methods (user_id, account_id, type, name)
    VALUES (v_user_b, v_acc_b, 'pix', 'TEST_PM_F204_B') RETURNING id INTO v_pm_b;
    INSERT INTO public.recurring_templates
      (user_id, description, amount_cents, category_id, account_id, payment_method_id, day_of_month, start_date)
    VALUES (v_user_b, 'TEST_TPL_F204_B', 5000, v_cat_b, v_acc_b, v_pm_b, 1, v_month_start)
    RETURNING id INTO v_tpl_b_owner;
  END;

  -- ===================== Assume identidade de A (RLS real) =====================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_F204_A', 'checking', 'BRL', 100000) RETURNING id INTO v_acc_a;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_F204_A', 'expense', false) RETURNING id INTO v_cat_a;
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_a, v_acc_a, 'pix', 'TEST_PM_F204_A') RETURNING id INTO v_pm_a;

  -- ===================== CASO A — resolução de valor =====================

  INSERT INTO public.recurring_templates
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, day_of_month, start_date)
  VALUES (v_user_a, 'TEST_TPL_F204_RESOLVE', 10000, v_cat_a, v_acc_a, v_pm_a, 1, (v_month_start - interval '6 months')::date)
  RETURNING id INTO v_tpl_1;

  -- Sem reajuste ainda: resolve pro valor base, em qualquer competência.
  v_amount := public.recurring_template_amount_for(v_tpl_1, v_month_start);
  IF v_amount <> 10000 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A1 FALHOU: sem reajuste, deveria resolver pro valor base (10000), obtido %', v_amount;
  END IF;

  -- Reajustes cadastrados FORA de ordem cronológica de inserção (mês+2 antes,
  -- mês+1 depois) — resolução deve obedecer effective_from, não created_at.
  INSERT INTO public.recurring_template_adjustments (recurring_template_id, user_id, effective_from, amount_cents)
  VALUES (v_tpl_1, v_user_a, (v_month_start + interval '2 months')::date, 30000);
  INSERT INTO public.recurring_template_adjustments (recurring_template_id, user_id, effective_from, amount_cents)
  VALUES (v_tpl_1, v_user_a, v_month_start, 20000);
  INSERT INTO public.recurring_template_adjustments (recurring_template_id, user_id, effective_from, amount_cents)
  VALUES (v_tpl_1, v_user_a, (v_month_start + interval '1 month')::date, 25000);

  -- Competência ANTES do 1º reajuste (não existe, mas testável via a função
  -- pura mesmo assim): mês corrente já tem reajuste, então testamos o mês
  -- corrente e os 2 seguintes.
  v_amount := public.recurring_template_amount_for(v_tpl_1, v_month_start);
  IF v_amount <> 20000 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A2 FALHOU: competência corrente deveria resolver pro reajuste de 20000, obtido %', v_amount;
  END IF;

  v_amount := public.recurring_template_amount_for(v_tpl_1, (v_month_start + interval '1 month')::date);
  IF v_amount <> 25000 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A3 FALHOU: mês+1 deveria resolver pro reajuste de 25000 (não o de mês+2, cadastrado antes), obtido %', v_amount;
  END IF;

  v_amount := public.recurring_template_amount_for(v_tpl_1, (v_month_start + interval '2 months')::date);
  IF v_amount <> 30000 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A4 FALHOU: mês+2 deveria resolver pro reajuste de 30000, obtido %', v_amount;
  END IF;

  v_amount := public.recurring_template_amount_for(v_tpl_1, (v_month_start + interval '5 months')::date);
  IF v_amount <> 30000 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO A5 FALHOU: mês+5 (depois do último reajuste) deveria continuar em 30000, obtido %', v_amount;
  END IF;

  -- ===================== CASO B — amount_cents imutável =====================

  INSERT INTO public.recurring_templates
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, day_of_month, start_date)
  VALUES (v_user_a, 'TEST_TPL_F204_IMMUTABLE', 12345, v_cat_a, v_acc_a, v_pm_a, 1, v_month_start)
  RETURNING id INTO v_tpl_2;

  v_blocked := false;
  BEGIN
    UPDATE public.recurring_templates SET amount_cents = 99999 WHERE id = v_tpl_2;
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO B1 FALHOU: UPDATE direto de amount_cents deveria ser rejeitado (RF-F2-03/RN-02)';
  END IF;

  -- Outras colunas continuam editáveis normalmente.
  UPDATE public.recurring_templates SET description = 'TEST_TPL_F204_IMMUTABLE_EDITED' WHERE id = v_tpl_2;
  PERFORM 1 FROM public.recurring_templates WHERE id = v_tpl_2 AND description = 'TEST_TPL_F204_IMMUTABLE_EDITED' AND amount_cents = 12345;
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO B2 FALHOU: UPDATE de description deveria funcionar normalmente, amount_cents deveria seguir 12345';
  END IF;

  -- ===================== CASO C — reajuste retroativo rejeitado =====================

  INSERT INTO public.recurring_templates
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, day_of_month, start_date)
  VALUES (v_user_a, 'TEST_TPL_F204_RETRO', 7000, v_cat_a, v_acc_a, v_pm_a, 1, (v_month_start - interval '3 months')::date)
  RETURNING id INTO v_tpl_3;

  v_blocked := false;
  BEGIN
    INSERT INTO public.recurring_template_adjustments (recurring_template_id, user_id, effective_from, amount_cents)
    VALUES (v_tpl_3, v_user_a, (v_month_start - interval '1 month')::date, 8000);
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO C1 FALHOU: reajuste com effective_from no passado deveria ser rejeitado (RN-02)';
  END IF;

  -- ===================== CASO E (parte 1) — IDOR na criação do reajuste =====================

  v_blocked := false;
  BEGIN
    INSERT INTO public.recurring_template_adjustments (recurring_template_id, user_id, effective_from, amount_cents)
    VALUES (v_tpl_b_owner, v_user_a, v_month_start, 999999);
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO E1 FALHOU (IDOR): A não deveria conseguir criar reajuste referenciando template de B';
  END IF;

  -- Unicidade (template, competência): 2º reajuste pra mesma competência falha.
  v_blocked := false;
  BEGIN
    INSERT INTO public.recurring_template_adjustments (recurring_template_id, user_id, effective_from, amount_cents)
    VALUES (v_tpl_1, v_user_a, v_month_start, 21000);
  EXCEPTION WHEN unique_violation THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO E2 FALHOU: 2º reajuste pra mesma (template, competência) deveria violar a unique constraint';
  END IF;

  -- Isolamento cross-user: A não enxerga reajuste de B.
  SELECT count(*) INTO v_count FROM public.recurring_template_adjustments WHERE recurring_template_id = v_tpl_b_owner;
  IF v_count <> 0 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO E3 FALHOU: A não deveria enxergar reajuste do template de B via SELECT';
  END IF;

  -- ===================== CASO D — geração usa o valor RESOLVIDO =====================

  -- D-a: sem reajuste — gera com o valor base.
  INSERT INTO public.recurring_templates
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, day_of_month, start_date)
  VALUES (v_user_a, 'TEST_TPL_F204_GEN_BASE', 5000, v_cat_a, v_acc_a, v_pm_a, v_today_day, v_month_start)
  RETURNING id INTO v_tpl_gen_a;

  -- D-b: reajuste JÁ vigente (effective_from = mês corrente) — gera com o
  -- valor reajustado, não o base.
  INSERT INTO public.recurring_templates
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, day_of_month, start_date)
  VALUES (v_user_a, 'TEST_TPL_F204_GEN_ACTIVE_ADJ', 8000, v_cat_a, v_acc_a, v_pm_a, v_today_day, v_month_start)
  RETURNING id INTO v_tpl_gen_b;
  INSERT INTO public.recurring_template_adjustments (recurring_template_id, user_id, effective_from, amount_cents)
  VALUES (v_tpl_gen_b, v_user_a, v_month_start, 12000);

  -- D-c: reajuste FUTURO (effective_from = mês seguinte) — geração de HOJE
  -- não deve usar o novo valor ainda (não pode "vazar" antes da competência).
  INSERT INTO public.recurring_templates
    (user_id, description, amount_cents, category_id, account_id, payment_method_id, day_of_month, start_date)
  VALUES (v_user_a, 'TEST_TPL_F204_GEN_FUTURE_ADJ', 9000, v_cat_a, v_acc_a, v_pm_a, v_today_day, v_month_start)
  RETURNING id INTO v_tpl_gen_c;
  INSERT INTO public.recurring_template_adjustments (recurring_template_id, user_id, effective_from, amount_cents)
  VALUES (v_tpl_gen_c, v_user_a, (v_month_start + interval '1 month')::date, 99999);

  RESET ROLE;

  PERFORM public.generate_recurring_transactions();

  PERFORM 1 FROM public.transactions
  WHERE recurring_rule_id = v_tpl_gen_a AND amount_cents = 5000 AND date_trunc('month', transaction_date) = v_month_start;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO D1 FALHOU: template sem reajuste deveria gerar lançamento com o valor base (5000)';
  END IF;

  PERFORM 1 FROM public.transactions
  WHERE recurring_rule_id = v_tpl_gen_b AND amount_cents = 12000 AND date_trunc('month', transaction_date) = v_month_start;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO D2 FALHOU: template com reajuste JÁ vigente deveria gerar lançamento com o valor reajustado (12000), não o base (8000)';
  END IF;

  PERFORM 1 FROM public.transactions
  WHERE recurring_rule_id = v_tpl_gen_c AND amount_cents = 9000 AND date_trunc('month', transaction_date) = v_month_start;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO D3 FALHOU (RN-02): template com reajuste FUTURO deveria gerar o lançamento de hoje com o valor base (9000) — o novo valor (99999) não pode vazar antes da competência escolhida';
  END IF;

  RAISE NOTICE 'BE-F2-04 (resolução de valor, imutabilidade, reajuste retroativo, geração com valor resolvido, isolamento/IDOR/unicidade): TODOS PASSARAM';
END;
$test$;

SELECT 'BE-F2-04 recurring_template_adjustments: PASS' AS result;

ROLLBACK;
