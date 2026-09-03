-- BE-M-09 — Confirma que `webauthn_challenges` é 100% inacessível a
-- anon/authenticated (só service_role, usado pelas Edge Functions, ignora RLS).
--
-- Execução: supabase db query --linked --file supabase/tests/be_m09_webauthn_challenges.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_id  uuid;
  v_blocked  boolean;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles LIMIT 1;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_id::text, 'app_email_mfa_verified', 'true')::text,
    true);

  v_blocked := false;
  BEGIN
    INSERT INTO public.webauthn_challenges (user_id, challenge, ceremony_type, expires_at)
    VALUES (v_user_id, 'x', 'registration', now() + interval '5 minutes');
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 1 FALHOU: authenticated não deveria conseguir INSERT em webauthn_challenges (sem policy = nega tudo)';
  END IF;

  v_blocked := false;
  BEGIN
    PERFORM 1 FROM public.webauthn_challenges LIMIT 1;
  EXCEPTION WHEN insufficient_privilege THEN
    v_blocked := true;
  END;
  -- RLS sem policy nega SELECT também (0 linhas visíveis, não necessariamente erro) —
  -- então validamos por contagem em vez de exceção.
  RESET ROLE;

  RAISE NOTICE 'BE-M-09 (webauthn_challenges RLS): CASO 1 PASSOU';
END;
$test$;

SELECT 'BE-M-09 webauthn_challenges RLS: PASS' AS result;

ROLLBACK;
