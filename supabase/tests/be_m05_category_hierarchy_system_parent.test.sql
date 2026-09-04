-- Regressão do bug corrigido em 20260904110000_fix_category_hierarchy_system_parent.sql:
-- validate_category_hierarchy() rejeitava 100% das subcategorias criadas sob
-- uma categoria de sistema (as 12 categorias padrão seedadas, user_id NULL),
-- porque exigia user_id do filho idêntico ao do pai. Toda conta nova só tem
-- essas 12 categorias como raiz, então o bug bloqueava a feature por completo
-- (RF-MVP-03 AC1: "taxonomia padrão... 100% editável").
--
-- Execução: supabase db query --linked --file supabase/tests/be_m05_category_hierarchy_system_parent.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_a  uuid;
  v_user_b  uuid := gen_random_uuid();
  v_sys_cat uuid;
  v_cat_b   uuid;
  v_sub     uuid;
  v_blocked boolean;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  SELECT id INTO v_sys_cat FROM public.categories WHERE name = 'Moradia' AND user_id IS NULL LIMIT 1;
  IF v_sys_cat IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: categoria padrão "Moradia" (user_id NULL) não encontrada — teste não pode rodar';
  END IF;

  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-b-m05cat@example.com', 'BE-M-05 (regressão) — usuário B fixture, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user_b, 'test-b-m05cat@example.com');
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_b, 'TEST_CAT_M05_B', 'expense', false)
  RETURNING id INTO v_cat_b;

  -- ===================== Assume identidade de A (RLS real) =====================
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  -- CASO 1 (o bug em si): subcategoria sob categoria de sistema agora é aceita.
  INSERT INTO public.categories (user_id, name, kind, is_system_default, parent_category_id)
  VALUES (v_user_a, 'TEST_SUBCAT_M05_UNDER_SYSTEM', 'expense', false, v_sys_cat)
  RETURNING id INTO v_sub;

  PERFORM 1 FROM public.categories WHERE id = v_sub AND parent_category_id = v_sys_cat;
  IF NOT FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 1 FALHOU: subcategoria sob categoria de sistema (Moradia) deveria ter sido criada';
  END IF;

  -- CASO 2 (defesa preservada): pai pertencente a OUTRO usuário real continua
  -- rejeitado — RLS já esconde a linha de B antes do trigger rodar (SELECT
  -- dentro de validate_category_hierarchy roda como o próprio A, SECURITY
  -- INVOKER), então a mensagem observada é "does not reference an existing
  -- category" (not found), não "must belong to the same user" — mesma
  -- propriedade de segurança (bloqueado), mensagem diferente da hipótese
  -- inicial deste teste.
  v_blocked := false;
  BEGIN
    INSERT INTO public.categories (user_id, name, kind, is_system_default, parent_category_id)
    VALUES (v_user_a, 'TEST_SUBCAT_M05_CROSSUSER', 'expense', false, v_cat_b);
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 2 FALHOU: subcategoria com pai de OUTRO usuário deveria continuar rejeitada';
  END IF;
  PERFORM 1 FROM public.categories WHERE name = 'TEST_SUBCAT_M05_CROSSUSER';
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 2 FALHOU: subcategoria com pai de OUTRO usuário não deveria ter sido persistida';
  END IF;

  RESET ROLE;

  RAISE NOTICE 'BE-M-05 (regressão, subcategoria sob categoria de sistema): TODOS OS 2 CASOS PASSARAM';
END;
$test$;

SELECT 'BE-M-05 category hierarchy (system parent fix): PASS' AS result;

ROLLBACK;
