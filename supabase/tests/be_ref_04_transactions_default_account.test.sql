-- BE-REF-04 — Novo trigger transactions_default_account_from_payment_method
-- (ADR-016 Decisão 3, RN-16, DIR-36). Prova, via RLS real (SET LOCAL ROLE
-- authenticated + request.jwt.claims, mesmo padrão de BE-M-13/BE-F2-02):
--
--   (1) payment_method_id de forma não-cartão, sem account_id no payload ->
--       resolve para a conta vinculada da forma de pagamento;
--   (2) payment_method_id de forma type=credit_card, sem account_id -> resolve
--       para a conta ativa mais antiga do usuário (Opção D, ADR-016);
--   (3) payment_method_id que não pertence ao usuário autenticado -> rejeitado
--       com erro explícito (checagem própria de ownership, independente de RLS);
--   (4) kind=transfer sem account_id -> continua exigindo account_id explícito
--       (trigger não atua, violação de NOT NULL);
--   (5) não-regressão: account_id explícito no payload nunca é sobrescrito pelo
--       trigger (mesmo quando diverge do account_id vinculado à forma de
--       pagamento) — mesmo caminho usado por generate_recurring_transactions
--       (be_f2_03:170-173), generate_recurring_transactions com ajuste
--       (be_f2_04:227-230), generate_installment_transactions
--       (be_f2_05:238-241) e generate_fixed_bill_transactions
--       (be_f2_06:171-174), que sempre enviam account_id explícito a partir da
--       própria linha do template/plano/conta fixa (NOT NULL nesses 3);
--   (6) RN-01/RF-F2-05 (ADR-016 Decisão 7): lançamento de cartão sem account_id
--       explícito ainda resolve card_invoice_id corretamente — nenhuma
--       interferência entre os dois mecanismos;
--   (7) RN-08 preservado no caminho novo: se a forma de pagamento aponta para
--       uma conta que foi desde então inativada, o INSERT sem account_id
--       explícito continua sendo bloqueado por transactions_block_inactive_account
--       (prova da correção de ordenação de trigger documentada na migration —
--       transactions_before_insert_account_from_payment_method precisa disparar
--       ANTES de transactions_before_insert_block_inactive_account);
--   (8) [Fix-loop, achado M-1/M-2] UPDATE (PATCH) que só muda payment_method_id,
--       omitindo account_id do payload — PostgREST preserva OLD.account_id
--       nesse caso (diferente de INSERT), então o trigger de UPDATE precisa
--       dispara também quando payment_method_id muda, não só quando account_id
--       é NULL. Cria lançamento com forma A (conta X), depois UPDATE só de
--       payment_method_id para forma B (conta Y) sem tocar account_id,
--       confirma que account_id migra para Y.
--   (9) [Fix-loop, achado M-3] usuário sem NENHUMA conta ativa tentando lançar
--       via forma de pagamento type=credit_card — confirma que o erro é a
--       exceção explícita nova (mensagem clara, errcode 23514), nunca a
--       violação de NOT NULL crua de transactions.account_id.
--   (10) [Fix-loop, addendum RN-08/UPDATE — achado sinalizado pela revisão de
--        frontend/FE-REF-04, BLOCKERS.md Bloqueio 020] UPDATE (PATCH) que muda
--        payment_method_id para uma forma vinculada a uma conta desde então
--        inativada — confirma que a checagem própria de "conta resolvida
--        ativa" (adicionada na função, não no trigger legado
--        transactions_block_inactive_account, que nunca roda em UPDATE)
--        também rejeita esse caso em UPDATE, não só em INSERT (CASO 7).
--
-- Execução: supabase db query --linked --file supabase/tests/be_ref_04_transactions_default_account.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_a          uuid;
  v_user_b          uuid := gen_random_uuid();
  v_acc_new         uuid;
  v_pm_pix_new      uuid;
  v_acc_other       uuid;
  v_card_a          uuid;
  v_pm_card_a       uuid;
  v_pm_b            uuid;
  v_expected_oldest uuid;
  v_resolved_acc    uuid;
  v_resolved_inv    uuid;
  v_cat_a           uuid;
  v_blocked         boolean;
  v_acc_inactive    uuid;
  v_pm_pix_inactive uuid;
  v_acc_c8_x        uuid;
  v_acc_c8_y        uuid;
  v_pm_c8_x         uuid;
  v_pm_c8_y         uuid;
  v_txn_c8          uuid;
  v_user_c          uuid := gen_random_uuid();
  v_card_c          uuid;
  v_pm_card_c       uuid;
  v_cat_sys         uuid;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  -- Conta ativa mais antiga do usuário HOJE (antes de qualquer fixture deste
  -- teste) — usada para prever o resultado do CASO 2 sem depender de estado
  -- específico de produção.
  SELECT id INTO v_expected_oldest
  FROM public.accounts
  WHERE user_id = v_user_a AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;
  IF v_expected_oldest IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: usuário real não tem nenhuma conta ativa — teste não pode rodar';
  END IF;

  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-b-ref04@example.com', 'BE-REF-04 — usuário B fixture, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'test-b-ref04@example.com');

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_b, 'TEST_ACC_REF04_B', 'checking', 'BRL', 1000) RETURNING id INTO v_acc_other;

  SELECT id INTO v_pm_b FROM public.payment_methods
  WHERE user_id = v_user_b AND account_id = v_acc_other AND type = 'pix' LIMIT 1;
  IF v_pm_b IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: seed automático (BE-REF-03) deveria ter criado pix para a conta de B';
  END IF;

  -- ===================== Assume identidade de A (RLS real) =====================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_REF04_A', 'expense', false) RETURNING id INTO v_cat_a;

  -- Nova conta de A — BE-REF-03 já semeia as 4 formas próprias automaticamente.
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_REF04_A_NEW', 'checking', 'BRL', 1000)
  RETURNING id INTO v_acc_new;

  SELECT id INTO v_pm_pix_new FROM public.payment_methods
  WHERE account_id = v_acc_new AND type = 'pix' LIMIT 1;
  IF v_pm_pix_new IS NULL THEN
    RESET ROLE; RAISE EXCEPTION 'FIXTURE: seed automático (BE-REF-03) deveria ter criado pix para a nova conta de A';
  END IF;

  -- ===================== CASO 1 — forma não-cartão resolve para a conta vinculada =====================
  INSERT INTO public.transactions
    (user_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_a, v_pm_pix_new, v_cat_a, 'expense', 500, current_date)
  RETURNING account_id INTO v_resolved_acc;

  IF v_resolved_acc IS DISTINCT FROM v_acc_new THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 1 FALHOU: account_id deveria ter sido resolvido para a conta vinculada da forma de pagamento (%), obtido %', v_acc_new, v_resolved_acc;
  END IF;

  -- ===================== CASO 2/6 — cartão resolve para a conta ativa mais antiga + card_invoice_id =====================
  INSERT INTO public.credit_cards (user_id, name, limit_cents, closing_day, due_day)
  VALUES (v_user_a, 'TEST_CARD_REF04_A', 500000, 10, 20)
  RETURNING id INTO v_card_a;

  SELECT id INTO v_pm_card_a FROM public.payment_methods
  WHERE credit_card_id = v_card_a AND type = 'credit_card' LIMIT 1;
  IF v_pm_card_a IS NULL THEN
    RESET ROLE; RAISE EXCEPTION 'FIXTURE CASO 2: cartão deveria ter gerado forma de pagamento "crédito" (BE-F2-01)';
  END IF;

  INSERT INTO public.transactions
    (user_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_a, v_pm_card_a, v_cat_a, 'expense', 1000, current_date)
  RETURNING account_id, card_invoice_id INTO v_resolved_acc, v_resolved_inv;

  IF v_resolved_acc IS DISTINCT FROM v_expected_oldest THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 2 FALHOU: account_id deveria ter sido resolvido para a conta ativa mais antiga (%), obtido %', v_expected_oldest, v_resolved_acc;
  END IF;
  IF v_resolved_inv IS NULL THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 6 FALHOU: card_invoice_id deveria ter sido resolvido normalmente (RN-01), sem interferência do trigger novo (ADR-016 Decisão 7)';
  END IF;

  -- ===================== CASO 3 — payment_method_id de B rejeitado =====================
  v_blocked := false;
  BEGIN
    INSERT INTO public.transactions
      (user_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
    VALUES (v_user_a, v_pm_b, v_cat_a, 'expense', 100, current_date);
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 3 FALHOU: INSERT referenciando payment_method_id de B (sem account_id) deveria ser rejeitado';
  END IF;

  -- ===================== CASO 4 — transfer sem account_id continua obrigatório =====================
  v_blocked := false;
  BEGIN
    INSERT INTO public.transactions
      (user_id, destination_account_id, kind, amount_cents, transaction_date)
    VALUES (v_user_a, v_acc_new, 'transfer', 100, current_date);
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 4 FALHOU: transfer sem account_id deveria falhar (NOT NULL) — trigger não deve atuar em kind=transfer';
  END IF;

  -- ===================== CASO 5 — account_id explícito nunca é sobrescrito =====================
  -- account_id explícito é DIFERENTE do vinculado à forma de pagamento (v_acc_new
  -- via v_pm_pix_new) mas pertence ao mesmo usuário (RLS permite) — mesmo padrão
  -- usado pelos 4 geradores automáticos de Fase 2 (ver cabeçalho do arquivo).
  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_a, v_expected_oldest, v_pm_pix_new, v_cat_a, 'expense', 200, current_date)
  RETURNING account_id INTO v_resolved_acc;

  IF v_resolved_acc IS DISTINCT FROM v_expected_oldest THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 5 FALHOU: account_id explícito (%) não deveria ter sido sobrescrito pelo trigger, obtido %', v_expected_oldest, v_resolved_acc;
  END IF;

  -- ===================== CASO 7 — RN-08 preservado (ordem do trigger) =====================
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_REF04_INACTIVE', 'checking', 'BRL', 1000)
  RETURNING id INTO v_acc_inactive;

  SELECT id INTO v_pm_pix_inactive FROM public.payment_methods
  WHERE account_id = v_acc_inactive AND type = 'pix' LIMIT 1;

  UPDATE public.accounts SET is_active = false WHERE id = v_acc_inactive;

  v_blocked := false;
  BEGIN
    INSERT INTO public.transactions
      (user_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
    VALUES (v_user_a, v_pm_pix_inactive, v_cat_a, 'expense', 100, current_date);
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 7 FALHOU: conta resolvida via payment_method_id está inativa — transactions_block_inactive_account (RN-08) deveria ter rejeitado o INSERT';
  END IF;

  -- ===================== CASO 8 — [Fix-loop M-1/M-2] UPDATE (PATCH) sem account_id =====================
  -- Cria lançamento com forma A (conta X), depois UPDATE só de
  -- payment_method_id para forma B (conta Y) SEM tocar account_id — confirma
  -- que account_id migra para Y (PostgREST preserva OLD.account_id em UPDATE
  -- que omite a coluna; o trigger de UPDATE precisa disparar mesmo assim).
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_REF04_C8_X', 'checking', 'BRL', 1000)
  RETURNING id INTO v_acc_c8_x;

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_REF04_C8_Y', 'checking', 'BRL', 1000)
  RETURNING id INTO v_acc_c8_y;

  SELECT id INTO v_pm_c8_x FROM public.payment_methods WHERE account_id = v_acc_c8_x AND type = 'pix' LIMIT 1;
  SELECT id INTO v_pm_c8_y FROM public.payment_methods WHERE account_id = v_acc_c8_y AND type = 'debit_card' LIMIT 1;

  INSERT INTO public.transactions
    (user_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_a, v_pm_c8_x, v_cat_a, 'expense', 700, current_date)
  RETURNING id, account_id INTO v_txn_c8, v_resolved_acc;

  IF v_resolved_acc IS DISTINCT FROM v_acc_c8_x THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 8 FIXTURE FALHOU: INSERT deveria ter resolvido account_id para X (%), obtido %', v_acc_c8_x, v_resolved_acc;
  END IF;

  -- PATCH real (só payment_method_id no payload — account_id nunca é enviado).
  UPDATE public.transactions
  SET payment_method_id = v_pm_c8_y
  WHERE id = v_txn_c8
  RETURNING account_id INTO v_resolved_acc;

  IF v_resolved_acc IS DISTINCT FROM v_acc_c8_y THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 8 FALHOU: UPDATE mudando só payment_method_id (sem account_id no payload) deveria ter migrado account_id para Y (%), obtido %', v_acc_c8_y, v_resolved_acc;
  END IF;

  -- ===================== CASO 10 — [Fix-loop, addendum RN-08/UPDATE] =====================
  -- Reaproveita o lançamento de CASO 8 (v_txn_c8, hoje em conta Y ativa) e a
  -- forma de pagamento inativa de CASO 7 (v_pm_pix_inactive -> v_acc_inactive,
  -- já desativada) — UPDATE mudando só payment_method_id para essa forma,
  -- ainda sem tocar account_id, deve ser rejeitado (a checagem própria de
  -- "conta resolvida ativa" precisa funcionar em UPDATE, não só em INSERT).
  v_blocked := false;
  BEGIN
    UPDATE public.transactions
    SET payment_method_id = v_pm_pix_inactive
    WHERE id = v_txn_c8;
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 10 FALHOU: UPDATE migrando (via payment_method_id) para uma conta inativa deveria ter sido rejeitado, mesmo sem account_id explícito no payload';
  END IF;

  RESET ROLE;

  -- ===================== CASO 9 — [Fix-loop M-3] cartão sem nenhuma conta ativa =====================
  SELECT id INTO v_cat_sys FROM public.categories WHERE is_system_default = true LIMIT 1;

  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-c-ref04@example.com', 'BE-REF-04 CASO 9 — usuário C fixture (sem nenhuma conta), só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user_c, 'test-c-ref04@example.com');

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_c::text, 'app_email_mfa_verified', 'true')::text,
    true);

  INSERT INTO public.credit_cards (user_id, name, limit_cents, closing_day, due_day)
  VALUES (v_user_c, 'TEST_CARD_REF04_C_NOACC', 100000, 10, 20)
  RETURNING id INTO v_card_c;

  SELECT id INTO v_pm_card_c FROM public.payment_methods
  WHERE credit_card_id = v_card_c AND type = 'credit_card' LIMIT 1;
  IF v_pm_card_c IS NULL THEN
    RESET ROLE; RAISE EXCEPTION 'FIXTURE CASO 9: cartão deveria ter gerado forma de pagamento "crédito" (BE-F2-01)';
  END IF;

  v_blocked := false;
  BEGIN
    INSERT INTO public.transactions
      (user_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
    VALUES (v_user_c, v_pm_card_c, v_cat_sys, 'expense', 100, current_date);
  EXCEPTION
    WHEN sqlstate '23514' THEN
      v_blocked := true;
    WHEN not_null_violation THEN
      RESET ROLE; RAISE EXCEPTION 'CASO 9 FALHOU: deveria ter estourado a exceção explícita (23514), não a violação de NOT NULL crua';
    WHEN others THEN
      v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 9 FALHOU: usuário sem nenhuma conta ativa tentando lançar via cartão deveria ter sido rejeitado com erro explícito';
  END IF;

  RESET ROLE;

  RAISE NOTICE 'BE-REF-04 (transactions_default_account_from_payment_method, casos 1-10): TODOS PASSARAM';
END;
$test$;

SELECT 'BE-REF-04 transactions default account from payment method: PASS' AS result;

ROLLBACK;
