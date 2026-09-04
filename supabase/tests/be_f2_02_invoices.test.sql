-- BE-F2-02 — Fechamento de fatura (RN-01) + limite disponível (RN-06) +
-- geração/atualização de invoice (DIR-13/RF-F2-05 AC3).
--
-- Prova, via RLS real (SET LOCAL ROLE authenticated + request.jwt.claims,
-- nunca como owner/postgres — mesmo padrão de BE-M-11/BE-M-13/BE-F2-01):
--   (A) credit_card_effective_closing_date / credit_card_invoice_competencia
--       são funções puras — testadas isoladas, com datas literais (não
--       dependem de current_date), incluindo o clamp de mês curto (RN-01);
--   (B) RN-01/AC2 ponta a ponta: lançamento no dia do fechamento cai na
--       fatura corrente; no dia seguinte, cai na próxima — via o trigger
--       real de transactions, não uma simulação;
--   (C) Isolamento cross-user e IDOR em invoices (B não lê/insere/edita fatura
--       de A) + nenhuma policy de UPDATE/DELETE existe para authenticated
--       (status só muda via close_due_invoices, SECURITY DEFINER);
--   (D) generate_upcoming_invoices (DIR-13, 3 competências) e
--       close_due_invoices (RF-F2-05 AC3) via RPC;
--   (E) get_credit_cards_available_limit (RN-06): soma despesas de TODAS as
--       faturas (aberta+fechada) do cartão, não só a corrente; escopado por
--       RLS ao próprio usuário.
--
-- Execução: supabase db query --linked --file supabase/tests/be_f2_02_invoices.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

-- ===================== CASO A — funções puras (sem fixture) =====================

DO $test$
BEGIN
  -- Fechamento normal, sem clamp.
  IF public.credit_card_effective_closing_date('2026-09-01', 15::smallint) <> '2026-09-15' THEN
    RAISE EXCEPTION 'CASO A1 FALHOU: effective_closing_date(set-09-01, 15) deveria ser 2026-09-15';
  END IF;

  -- Clamp: closing_day=31 num mês de 28 dias (2027 não é bissexto).
  IF public.credit_card_effective_closing_date('2027-02-01', 31::smallint) <> '2027-02-28' THEN
    RAISE EXCEPTION 'CASO A2 FALHOU: effective_closing_date(2027-02, 31) deveria clampar para 2027-02-28';
  END IF;

  -- Clamp: closing_day=31 num mês de 29 dias (2028 é bissexto).
  IF public.credit_card_effective_closing_date('2028-02-01', 31::smallint) <> '2028-02-29' THEN
    RAISE EXCEPTION 'CASO A3 FALHOU: effective_closing_date(2028-02, 31) deveria clampar para 2028-02-29';
  END IF;

  -- RN-01: no dia do fechamento (ou antes) -> competência corrente.
  IF public.credit_card_invoice_competencia(15::smallint, '2026-09-15') <> '2026-09-01' THEN
    RAISE EXCEPTION 'CASO A4 FALHOU: lançamento NO dia do fechamento deveria ficar na fatura corrente';
  END IF;

  -- RN-01/AC2: no dia seguinte ao fechamento -> próxima competência.
  IF public.credit_card_invoice_competencia(15::smallint, '2026-09-16') <> '2026-10-01' THEN
    RAISE EXCEPTION 'CASO A5 FALHOU: lançamento pós-fechamento deveria cair na próxima fatura';
  END IF;

  -- RN-01 + clamp combinados: closing_day=31 num fevereiro de 28 dias nunca
  -- deveria "rolar" para março (o clamp já garante que todo dia do mês curto
  -- é <= data de fechamento efetiva).
  IF public.credit_card_invoice_competencia(31::smallint, '2027-02-27') <> '2027-02-01' THEN
    RAISE EXCEPTION 'CASO A6 FALHOU: dia 27/fev com closing_day=31 deveria ficar em fevereiro (clamp)';
  END IF;
  IF public.credit_card_invoice_competencia(31::smallint, '2027-02-28') <> '2027-02-01' THEN
    RAISE EXCEPTION 'CASO A7 FALHOU: último dia de um fevereiro de 28 dias com closing_day=31 deveria ficar em fevereiro (clamp, sem estourar pra março)';
  END IF;

  RAISE NOTICE 'BE-F2-02 CASO A (funções puras): TODOS PASSARAM';
END;
$test$;

DO $test$
DECLARE
  v_user_a      uuid;
  v_user_b      uuid := gen_random_uuid();
  v_acc_a       uuid;
  v_cat_a       uuid;
  v_month_start date := date_trunc('month', current_date)::date;
  v_card_b      uuid;
  v_card_rn01   uuid;
  v_pm_rn01     uuid;
  v_card_gen    uuid;
  v_pm_gen      uuid;
  v_inv_current uuid;
  v_inv_next    uuid;
  v_inv_old     uuid;
  v_count       integer;
  v_blocked     boolean;
  v_limit_row   record;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-b-f202@example.com', 'BE-F2-02 — usuário B fixture, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'test-b-f202@example.com');

  -- Fixture de B (como postgres) — cartão + 1 fatura própria, para os casos de
  -- isolamento/IDOR.
  INSERT INTO public.credit_cards (user_id, name, limit_cents, closing_day, due_day)
  VALUES (v_user_b, 'TEST_CARD_F202_B', 200000, 10, 20)
  RETURNING id INTO v_card_b;

  -- ===================== Assume identidade de A (RLS real) =====================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_F202_A', 'checking', 'BRL', 100000) RETURNING id INTO v_acc_a;

  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_F202_A', 'expense', false) RETURNING id INTO v_cat_a;

  -- ===================== CASO B — RN-01/AC2 ponta a ponta =====================

  INSERT INTO public.credit_cards (user_id, name, limit_cents, closing_day, due_day)
  VALUES (v_user_a, 'TEST_CARD_F202_RN01', 1000000, 15, 25)
  RETURNING id INTO v_card_rn01;

  SELECT id INTO v_pm_rn01 FROM public.payment_methods WHERE credit_card_id = v_card_rn01 AND type = 'credit_card';
  IF v_pm_rn01 IS NULL THEN
    RESET ROLE; RAISE EXCEPTION 'FIXTURE CASO B: cartão deveria ter gerado forma de pagamento "crédito" (BE-F2-01)';
  END IF;

  -- Lançamento NO dia do fechamento (dia 15 do mês corrente) -> fatura corrente.
  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_a, v_acc_a, v_pm_rn01, v_cat_a, 'expense', 30000, v_month_start + 14)
  RETURNING card_invoice_id INTO v_inv_current;

  IF v_inv_current IS NULL THEN
    RESET ROLE; RAISE EXCEPTION 'CASO B1 FALHOU: lançamento em cartão deveria ter card_invoice_id preenchido automaticamente';
  END IF;

  PERFORM 1 FROM public.invoices WHERE id = v_inv_current AND competencia = v_month_start AND status = 'aberta';
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO B2 FALHOU: lançamento NO dia do fechamento deveria estar na fatura da competência corrente (aberta)';
  END IF;

  -- Lançamento no dia SEGUINTE ao fechamento (dia 16) -> próxima fatura.
  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_a, v_acc_a, v_pm_rn01, v_cat_a, 'expense', 20000, v_month_start + 15)
  RETURNING card_invoice_id INTO v_inv_next;

  IF v_inv_next IS NULL OR v_inv_next = v_inv_current THEN
    RESET ROLE; RAISE EXCEPTION 'CASO B3 FALHOU: lançamento pós-fechamento deveria estar numa fatura DIFERENTE da corrente';
  END IF;

  PERFORM 1 FROM public.invoices
  WHERE id = v_inv_next
    AND competencia = (v_month_start + interval '1 month')::date
    AND status = 'aberta';
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO B4 FALHOU: lançamento pós-fechamento deveria estar na fatura do mês SEGUINTE, nunca na já fechada (RN-01 AC2)';
  END IF;

  -- ===================== CASO C — isolamento cross-user + IDOR =====================

  SELECT count(*) INTO v_count FROM public.invoices WHERE credit_card_id = v_card_b;
  IF v_count <> 0 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO C1 FALHOU: A não deveria enxergar fatura do cartão de B via SELECT';
  END IF;

  v_blocked := false;
  BEGIN
    INSERT INTO public.invoices (credit_card_id, user_id, competencia)
    VALUES (v_card_b, v_user_a, (v_month_start + interval '3 months')::date);
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO C2 FALHOU (IDOR): A não deveria conseguir INSERT em invoices referenciando credit_card_id de B';
  END IF;

  -- Nenhuma policy de UPDATE/DELETE para authenticated — 0 linhas afetadas,
  -- mesmo sobre uma fatura própria.
  UPDATE public.invoices SET status = 'fechada' WHERE id = v_inv_current;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO C3 FALHOU: client não deveria conseguir UPDATE em invoices (status só muda via close_due_invoices)';
  END IF;

  DELETE FROM public.invoices WHERE id = v_inv_current;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO C4 FALHOU: client não deveria conseguir DELETE em invoices';
  END IF;

  -- ===================== CASO E (parte 1) — RN-06, como A =====================

  SELECT * INTO v_limit_row FROM public.get_credit_cards_available_limit() WHERE credit_card_id = v_card_rn01;
  IF v_limit_row IS NULL THEN
    RESET ROLE; RAISE EXCEPTION 'CASO E1 FALHOU: get_credit_cards_available_limit deveria retornar o cartão TEST_CARD_F202_RN01';
  END IF;
  IF v_limit_row.committed_cents <> 50000 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO E2 FALHOU: committed_cents deveria somar as 2 despesas (fatura corrente + próxima) = 50000, obtido %', v_limit_row.committed_cents;
  END IF;
  IF v_limit_row.available_cents <> 950000 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO E3 FALHOU: available_cents deveria ser 1000000 - 50000 = 950000, obtido %', v_limit_row.available_cents;
  END IF;

  -- A não enxerga o cartão de B na própria leitura de limite (RLS).
  PERFORM 1 FROM public.get_credit_cards_available_limit() WHERE credit_card_id = v_card_b;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO E4 FALHOU: get_credit_cards_available_limit não deveria expor o cartão de B para A';
  END IF;

  -- ===================== CASO D — generate_upcoming_invoices / close_due_invoices =====================

  INSERT INTO public.credit_cards (user_id, name, limit_cents, closing_day, due_day)
  VALUES (v_user_a, 'TEST_CARD_F202_GEN', 400000, 10, 20)
  RETURNING id INTO v_card_gen;

  SELECT id INTO v_pm_gen FROM public.payment_methods WHERE credit_card_id = v_card_gen AND type = 'credit_card';
  IF v_pm_gen IS NULL THEN
    RESET ROLE; RAISE EXCEPTION 'FIXTURE CASO D: cartão TEST_CARD_F202_GEN deveria ter gerado forma de pagamento';
  END IF;

  RESET ROLE;

  -- generate_upcoming_invoices roda como SECURITY DEFINER (job global) — chamado
  -- fora do contexto RLS de A de propósito, mesma forma que o pg_cron chama.
  PERFORM public.generate_upcoming_invoices();

  SELECT count(*) INTO v_count
  FROM public.invoices
  WHERE credit_card_id = v_card_gen
    AND competencia IN (
      v_month_start,
      (v_month_start + interval '1 month')::date,
      (v_month_start + interval '2 months')::date
    );
  IF v_count <> 3 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO D1 FALHOU (DIR-13): esperava 3 faturas (competência atual + 2 futuras) para o cartão novo, obtido %', v_count;
  END IF;

  -- Idempotência: rodar de novo não duplica.
  PERFORM public.generate_upcoming_invoices();
  SELECT count(*) INTO v_count FROM public.invoices WHERE credit_card_id = v_card_gen;
  IF v_count <> 3 THEN
    RESET ROLE; RAISE EXCEPTION 'CASO D2 FALHOU: generate_upcoming_invoices deveria ser idempotente (ainda 3 faturas), obtido %', v_count;
  END IF;

  -- Fatura manualmente "vencida" (competência de 2 meses atrás, ainda aberta)
  -- para provar que close_due_invoices fecha o que já passou do fechamento...
  INSERT INTO public.invoices (credit_card_id, user_id, competencia, status)
  VALUES (v_card_gen, v_user_a, (v_month_start - interval '2 months')::date, 'aberta')
  RETURNING id INTO v_inv_old;

  PERFORM public.close_due_invoices();

  PERFORM 1 FROM public.invoices WHERE id = v_inv_old AND status = 'fechada';
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO D3 FALHOU (RF-F2-05 AC3): fatura de competência passada deveria ter sido fechada por close_due_invoices';
  END IF;

  -- ...e NÃO fecha a competência corrente/futuras (ainda dentro do ciclo).
  PERFORM 1 FROM public.invoices
  WHERE credit_card_id = v_card_gen
    AND competencia IN (v_month_start, (v_month_start + interval '1 month')::date, (v_month_start + interval '2 months')::date)
    AND status <> 'aberta';
  IF FOUND THEN
    RAISE EXCEPTION 'CASO D4 FALHOU: close_due_invoices não deveria ter fechado fatura corrente/futura ainda dentro do ciclo';
  END IF;

  RAISE NOTICE 'BE-F2-02 CASOS B-E (RN-01 ponta a ponta, isolamento/IDOR, RN-06, DIR-13/AC3): TODOS PASSARAM';
END;
$test$;

SELECT 'BE-F2-02 invoices: PASS' AS result;

ROLLBACK;
