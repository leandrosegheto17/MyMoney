-- BE-M-09 — Confirma que: (1) cliente autenticado NÃO consegue mais ler
-- pin_hash/pin_failed_attempts/pin_locked_until via SELECT direto; (2) cliente
-- autenticado NÃO consegue mais escrever pin_hash via UPDATE direto; (3)
-- set_pin/verify_pin continuam funcionando normalmente (agora SECURITY DEFINER);
-- (4) colunas não-sensíveis de profiles continuam legíveis/editáveis.
--
-- Execução: supabase db query --linked --file supabase/tests/be_m09_profiles_pin_privacy.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_id  uuid;
  v_blocked  boolean;
  v_ok       boolean;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_id::text, 'app_email_mfa_verified', 'true')::text,
    true);

  -- CASO 1: SELECT direto de pin_hash é negado (permission denied for column).
  v_blocked := false;
  BEGIN
    PERFORM pin_hash FROM public.profiles WHERE id = v_user_id;
  EXCEPTION WHEN insufficient_privilege THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: SELECT direto de pin_hash deveria ser negado por GRANT de coluna';
  END IF;

  -- CASO 2: UPDATE direto de pin_hash é negado.
  v_blocked := false;
  BEGIN
    UPDATE public.profiles SET pin_hash = 'not-a-real-hash' WHERE id = v_user_id;
  EXCEPTION WHEN insufficient_privilege THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: UPDATE direto de pin_hash deveria ser negado por GRANT de coluna';
  END IF;

  -- CASO 3: colunas não-sensíveis continuam de leitura/escrita normal.
  UPDATE public.profiles SET full_name = 'TEST_NOME_TEMP' WHERE id = v_user_id;
  SELECT (full_name = 'TEST_NOME_TEMP') INTO v_ok FROM public.profiles WHERE id = v_user_id;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'CASO 3 FALHOU: full_name deveria continuar editável/legível normalmente';
  END IF;

  -- CASO 4: set_pin/verify_pin continuam funcionando (agora SECURITY DEFINER).
  PERFORM public.set_pin('135790');
  SELECT public.verify_pin('135790') INTO v_ok;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'CASO 4 FALHOU: verify_pin deveria confirmar o PIN recém-configurado por set_pin';
  END IF;

  SELECT public.verify_pin('000000') INTO v_ok;
  IF v_ok THEN
    RAISE EXCEPTION 'CASO 4b FALHOU: verify_pin com PIN errado deveria retornar false';
  END IF;

  RESET ROLE;

  RAISE NOTICE 'BE-M-09 (profiles pin privacy): TODOS OS 4 CASOS PASSARAM';
END;
$test$;

SELECT 'BE-M-09 profiles pin privacy: PASS' AS result;

ROLLBACK;
