-- BE-M-03 (CRUD contas) / BE-M-04 (CRUD formas de pagamento) / BE-M-05 (CRUD
-- categorias) — casos de aceite ainda não cobertos pelos testes de BE-M-00/01/02.
-- Usa `SET LOCAL ROLE authenticated` + `request.jwt.claims` para exercitar RLS de
-- verdade (não só como owner/postgres, que ignora RLS) nos casos que precisam.
--
-- Execução: supabase db query --linked --file supabase/tests/be_m03_04_05_crud.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_id      uuid;
  v_acc          uuid;
  v_parent_cat   uuid;
  v_child_cat    uuid;
  v_blocked      boolean;
  v_balance      bigint;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  -- ===================== BE-M-03: CRUD de contas =====================

  -- CASO 1 (RF-MVP-01 AC2): tipo ausente é rejeitado (NOT NULL).
  v_blocked := false;
  BEGIN
    INSERT INTO public.accounts (user_id, name, currency, initial_balance_cents)
    VALUES (v_user_id, 'TEST_ACC_SEM_TIPO', 'BRL', 100);
  EXCEPTION WHEN not_null_violation THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CASO 1 FALHOU (RF-MVP-01 AC2): conta sem type deveria ser rejeitada';
  END IF;

  -- CASO 2 (RF-MVP-01 AC3): editar saldo inicial recalcula o saldo consolidado.
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_id, 'TEST_ACC_EDIT', 'checking', 'BRL', 10000)
  RETURNING id INTO v_acc;

  UPDATE public.accounts SET initial_balance_cents = 15000 WHERE id = v_acc;

  SELECT current_balance_cents INTO v_balance FROM public.accounts WHERE id = v_acc;
  IF v_balance <> 15000 THEN
    RAISE EXCEPTION 'CASO 2 FALHOU (RF-MVP-01 AC3): saldo deveria acompanhar edição do saldo inicial (15000), obtido %', v_balance;
  END IF;

  -- CASO 3: conta SEM lançamento vinculado pode ser excluída definitivamente.
  DELETE FROM public.accounts WHERE id = v_acc;
  IF EXISTS (SELECT 1 FROM public.accounts WHERE id = v_acc) THEN
    RAISE EXCEPTION 'CASO 3 FALHOU: conta sem vínculo deveria ter sido excluída';
  END IF;

  -- ===================== BE-M-05: CRUD de categorias =====================

  -- CASO 4: hierarquia de 2 níveis é permitida (categoria > subcategoria).
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_id, 'TEST_CAT_PAI', 'expense', false)
  RETURNING id INTO v_parent_cat;

  INSERT INTO public.categories (user_id, parent_category_id, name, kind, is_system_default)
  VALUES (v_user_id, v_parent_cat, 'TEST_CAT_FILHA', 'expense', false)
  RETURNING id INTO v_child_cat;

  -- CASO 5: hierarquia de 3 níveis é bloqueada (filha não pode virar avó).
  v_blocked := false;
  BEGIN
    INSERT INTO public.categories (user_id, parent_category_id, name, kind, is_system_default)
    VALUES (v_user_id, v_child_cat, 'TEST_CAT_NETA', 'expense', false);
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CASO 5 FALHOU: hierarquia de 3 níveis deveria ser bloqueada (validate_category_hierarchy)';
  END IF;

  -- CASO 6: categoria não pode ser seu próprio pai.
  v_blocked := false;
  BEGIN
    UPDATE public.categories SET parent_category_id = id WHERE id = v_parent_cat;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CASO 6 FALHOU: categoria não deveria poder ser seu próprio pai';
  END IF;

  -- ===================== BE-M-04: RLS real (formas de pagamento) =====================

  -- CASO 7 (RF-MVP-02 AC3): via RLS real (authenticated), usuário cria forma
  -- de pagamento customizada com sucesso.
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_id, 'TEST_ACC_FOR_PM_CUSTOM', 'checking', 'BRL', 100)
  RETURNING id INTO v_acc;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_id::text, 'app_email_mfa_verified', 'true')::text,
    true);

  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_id, v_acc, 'pix', 'TEST_PM_CUSTOM_TED');

  RESET ROLE;

  IF NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE name = 'TEST_PM_CUSTOM_TED') THEN
    RAISE EXCEPTION 'CASO 7 FALHOU (RF-MVP-02 AC3): forma de pagamento customizada não foi criada via RLS';
  END IF;

  -- CASO 8 (RF-MVP-02 AC1, via RLS real): forma padrão não pode ser editada
  -- nem excluída pelo próprio dono, mesmo autenticado e com MFA verificado.
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_id, 'TEST_ACC_RLS_PM', 'checking', 'BRL', 100)
  RETURNING id INTO v_acc;
  -- trigger de BE-M-02 já semeou as 4 formas padrão para v_acc (1ª conta "nova"
  -- deste teste, mas o usuário já tem defaults de casos anteriores — idempotente,
  -- então usamos a forma padrão já existente para o teste de RLS)

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_id::text, 'app_email_mfa_verified', 'true')::text,
    true);

  UPDATE public.payment_methods
  SET name = 'HACKED'
  WHERE user_id = v_user_id AND is_system_default = true;

  IF FOUND THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 8 FALHOU: UPDATE via RLS deveria ter afetado 0 linhas (forma padrão protegida)';
  END IF;

  DELETE FROM public.payment_methods
  WHERE user_id = v_user_id AND is_system_default = true;

  IF FOUND THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 8b FALHOU: DELETE via RLS deveria ter afetado 0 linhas (forma padrão protegida)';
  END IF;

  RESET ROLE;

  RAISE NOTICE 'BE-M-03/04/05 CRUD: TODOS OS 8 CASOS PASSARAM';
END;
$test$;

SELECT 'BE-M-03/04/05 CRUD: PASS' AS result;

ROLLBACK;
