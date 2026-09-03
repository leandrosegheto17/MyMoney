-- BE-M-13 — Correção sistêmica de autorização de referência cruzada (IDOR),
-- Bloqueio 010/SEC-DEBT-002. Prova, via RLS real (SET LOCAL ROLE authenticated +
-- request.jwt.claims, mesmo padrão de BE-M-04/BE-M-08/BE-M-11 — nunca como
-- owner/postgres), que:
--
--   (1) A não consegue INSERT em `budget` referenciando `category_id` de B;
--   (2) A não consegue INSERT em `transactions` referenciando `account_id`/
--       `category_id`/`payment_method_id`/`destination_account_id` de B
--       (um caso por FK, incluindo kind=transfer para destination_account_id);
--   (3) A não consegue UPDATE de um `budget`/`transaction` próprio para
--       redirecionar a FK para uma entidade de B;
--   (4) Cenário exato do DevSecOps (SECURITY-REVIEW.md Seção 1.2): A insere
--       `budget` referenciando `category_id` de B (via fixture direta, já que a
--       correção do item 1 bloquearia isso pela API — o objetivo aqui é provar
--       que, MESMO SE uma referência cross-tenant já existisse, o DELETE de B
--       continuaria bloqueado, SECURITY DEFINER dos triggers RN-08/RN-09);
--   (5) fluxo legítimo (mesmo usuário) continua funcionando sem regressão, para
--       budget e para as 4 FKs de transactions (incluindo category_id de
--       sistema, user_id IS NULL, que deve continuar permitido).
--
-- Execução: supabase db query --linked --file supabase/tests/be_m13_fk_ownership.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_a       uuid;
  v_user_b       uuid := gen_random_uuid(); -- usuário B real (auth.users), só para este teste
  v_acc_a        uuid;
  v_acc_a2       uuid;
  v_cat_a        uuid;
  v_pm_a         uuid;
  v_txn_a        uuid;
  v_acc_b        uuid;
  v_cat_b        uuid;
  v_pm_b         uuid;
  v_cat_sys      uuid;
  v_blocked      boolean;
  v_id           uuid;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  SELECT id INTO v_cat_sys FROM public.categories WHERE is_system_default = true LIMIT 1;
  IF v_cat_sys IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhuma categoria de sistema encontrada';
  END IF;

  -- ===================== Fixtures (como postgres, ignora RLS) =====================
  -- Usuário B precisa existir de fato em auth.users (accounts/categories/
  -- payment_methods têm FK ON DELETE CASCADE para auth.users(id) — não dá para
  -- simular B só via JWT quando B precisa ser DONO de uma fixture, diferente de
  -- BE-M-11 onde B só precisa ser o ATACANTE). Allow-list temporária (BE-M-12)
  -- só dentro desta transação, desfeita pelo ROLLBACK final — nenhum resíduo.
  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-b-m13@example.com', 'BE-M-13 — usuário B fixture, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'test-b-m13@example.com');

  -- A: entidades próprias, para o fluxo legítimo.
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_M13_A', 'checking', 'BRL', 1000) RETURNING id INTO v_acc_a;

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_M13_A2', 'checking', 'BRL', 1000) RETURNING id INTO v_acc_a2;

  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_M13_A', 'expense', false) RETURNING id INTO v_cat_a;

  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_a, v_acc_a, 'pix', 'TEST_PM_M13_A') RETURNING id INTO v_pm_a;

  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_a, v_acc_a, v_pm_a, v_cat_a, 'expense', 500, current_date)
  RETURNING id INTO v_txn_a;

  -- B: entidades "alheias", que A vai tentar referenciar sem permissão.
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_b, 'TEST_ACC_M13_B', 'checking', 'BRL', 1000) RETURNING id INTO v_acc_b;

  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_b, 'TEST_CAT_M13_B', 'expense', false) RETURNING id INTO v_cat_b;

  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_b, v_acc_b, 'pix', 'TEST_PM_M13_B') RETURNING id INTO v_pm_b;

  -- ===================== Assume identidade de A (RLS real) =====================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  -- CASO 1 (budget.category_id de B): rejeitado.
  v_blocked := false;
  BEGIN
    INSERT INTO public.budget (user_id, category_id, month, limit_cents)
    VALUES (v_user_a, v_cat_b, date_trunc('month', current_date)::date, 10000);
  EXCEPTION WHEN insufficient_privilege OR others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 1 FALHOU: INSERT budget referenciando category_id de B deveria ser rejeitado';
  END IF;

  -- CASO 2 (transactions.account_id de B): rejeitado.
  v_blocked := false;
  BEGIN
    INSERT INTO public.transactions
      (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
    VALUES (v_user_a, v_acc_b, v_pm_a, v_cat_a, 'expense', 100, current_date);
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 2 FALHOU: INSERT transaction referenciando account_id de B deveria ser rejeitado';
  END IF;

  -- CASO 3 (transactions.category_id de B): rejeitado.
  v_blocked := false;
  BEGIN
    INSERT INTO public.transactions
      (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
    VALUES (v_user_a, v_acc_a, v_pm_a, v_cat_b, 'expense', 100, current_date);
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 3 FALHOU: INSERT transaction referenciando category_id de B deveria ser rejeitado';
  END IF;

  -- CASO 4 (transactions.payment_method_id de B): rejeitado.
  v_blocked := false;
  BEGIN
    INSERT INTO public.transactions
      (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
    VALUES (v_user_a, v_acc_a, v_pm_b, v_cat_a, 'expense', 100, current_date);
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 4 FALHOU: INSERT transaction referenciando payment_method_id de B deveria ser rejeitado';
  END IF;

  -- CASO 5 (transactions.destination_account_id de B, kind=transfer): rejeitado.
  v_blocked := false;
  BEGIN
    INSERT INTO public.transactions
      (user_id, account_id, destination_account_id, kind, amount_cents, transaction_date)
    VALUES (v_user_a, v_acc_a, v_acc_b, 'transfer', 100, current_date);
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 5 FALHOU: INSERT transfer referenciando destination_account_id de B deveria ser rejeitado';
  END IF;

  -- CASO 6 (UPDATE budget próprio redirecionando category_id para B): rejeitado.
  INSERT INTO public.budget (user_id, category_id, month, limit_cents)
  VALUES (v_user_a, v_cat_a, date_trunc('month', current_date + interval '2 months')::date, 20000)
  RETURNING id INTO v_id;

  v_blocked := false;
  BEGIN
    UPDATE public.budget SET category_id = v_cat_b WHERE id = v_id;
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  -- UPDATE sob RLS pode não levantar exceção mas afetar 0 linhas (USING não bate
  -- mais após a mudança) — trata ambos os casos como "rejeitado".
  IF NOT v_blocked THEN
    PERFORM 1 FROM public.budget WHERE id = v_id AND category_id = v_cat_b;
    IF FOUND THEN
      RESET ROLE; RAISE EXCEPTION 'CASO 6 FALHOU: UPDATE de budget redirecionando category_id para B deveria ser rejeitado';
    END IF;
  END IF;

  -- CASO 7 (UPDATE transaction próprio redirecionando account_id para B): rejeitado.
  v_blocked := false;
  BEGIN
    UPDATE public.transactions SET account_id = v_acc_b WHERE id = v_txn_a;
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    PERFORM 1 FROM public.transactions WHERE id = v_txn_a AND account_id = v_acc_b;
    IF FOUND THEN
      RESET ROLE; RAISE EXCEPTION 'CASO 7 FALHOU: UPDATE de transaction redirecionando account_id para B deveria ser rejeitado';
    END IF;
  END IF;

  -- ===================== CASO 8 — fluxo legítimo, sem regressão =====================

  -- budget com category_id próprio: continua funcionando.
  INSERT INTO public.budget (user_id, category_id, month, limit_cents)
  VALUES (v_user_a, v_cat_a, date_trunc('month', current_date + interval '3 months')::date, 30000)
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 8a FALHOU: INSERT budget legítimo (mesmo usuário) deveria ter sucedido';
  END IF;
  UPDATE public.budget SET limit_cents = 35000 WHERE id = v_id;
  PERFORM 1 FROM public.budget WHERE id = v_id AND limit_cents = 35000;
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 8b FALHOU: UPDATE budget legítimo (mesmo usuário) deveria ter sucedido';
  END IF;

  -- transaction com todas as FKs próprias: continua funcionando.
  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_a, v_acc_a, v_pm_a, v_cat_a, 'expense', 250, current_date)
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 8c FALHOU: INSERT transaction legítima (mesmo usuário) deveria ter sucedido';
  END IF;
  UPDATE public.transactions SET amount_cents = 260 WHERE id = v_id;
  PERFORM 1 FROM public.transactions WHERE id = v_id AND amount_cents = 260;
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 8d FALHOU: UPDATE transaction legítima (mesmo usuário) deveria ter sucedido';
  END IF;

  -- transaction com category_id de SISTEMA (user_id IS NULL) continua permitida.
  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_a, v_acc_a, v_pm_a, v_cat_sys, 'expense', 300, current_date)
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 8e FALHOU: INSERT transaction com categoria de sistema deveria ter sucedido';
  END IF;

  -- transfer legítima entre 2 contas próprias continua permitida.
  INSERT INTO public.transactions
    (user_id, account_id, destination_account_id, kind, amount_cents, transaction_date)
  VALUES (v_user_a, v_acc_a, v_acc_a2, 'transfer', 400, current_date)
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 8f FALHOU: INSERT transfer legítima (2 contas próprias) deveria ter sucedido';
  END IF;

  RESET ROLE;

  RAISE NOTICE 'BE-M-13 (ownership de FK em budget/transactions, casos 1-8): TODOS PASSARAM';
END;
$test$;

-- ===================== CASO 9 (cenário exato do DevSecOps) =====================
-- "A insere budget referenciando category_id de B; B tenta excluir essa categoria"
-- — confirma que o DELETE de B é bloqueado (SECURITY DEFINER dos triggers RN-08/
-- RN-09, item (b) da correção). A referência cross-tenant em si é criada como
-- postgres (bypassa RLS) porque, com o item (a) já corrigido, a API nunca deixaria
-- essa referência existir — o objetivo deste caso é isolar e provar o item (b)
-- independentemente do item (a).

DO $test$
DECLARE
  v_user_a  uuid;
  v_user_b  uuid := gen_random_uuid();
  v_cat_b   uuid;
  v_budget  uuid;
  v_blocked boolean;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;

  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-b-m13-devsecops@example.com', 'BE-M-13 CASO 9 — usuário B fixture, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'test-b-m13-devsecops@example.com');

  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_b, 'TEST_CAT_M13_DEVSECOPS_B', 'expense', false)
  RETURNING id INTO v_cat_b;

  -- A referencia (como postgres — simula o estado que o achado original descreveu).
  INSERT INTO public.budget (user_id, category_id, month, limit_cents)
  VALUES (v_user_a, v_cat_b, date_trunc('month', current_date + interval '4 months')::date, 5000)
  RETURNING id INTO v_budget;

  -- B (dono da categoria) tenta excluí-la — deve ser bloqueado mesmo sem "ver"
  -- o budget de A sob a própria RLS, porque o trigger agora é SECURITY DEFINER.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_b::text, 'app_email_mfa_verified', 'true')::text,
    true);

  v_blocked := false;
  BEGIN
    DELETE FROM public.categories WHERE id = v_cat_b;
  EXCEPTION WHEN others THEN
    v_blocked := true;
  END;

  RESET ROLE;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CASO 9 FALHOU (cenário DevSecOps): DELETE de categoria por B deveria ter sido bloqueado por vínculo cross-tenant (budget de A)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = v_cat_b) THEN
    RAISE EXCEPTION 'CASO 9 FALHOU: categoria de B foi apagada apesar do bloqueio esperado';
  END IF;

  RAISE NOTICE 'BE-M-13 CASO 9 (cenário exato DevSecOps — SECURITY DEFINER cross-tenant): PASSOU';
END;
$test$;

SELECT 'BE-M-13 FK ownership + SECURITY DEFINER guards: PASS' AS result;

ROLLBACK;
