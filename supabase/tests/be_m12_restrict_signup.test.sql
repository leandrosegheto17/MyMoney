-- BE-M-12 — Confirma que INSERT em auth.users com e-mail fora da allow-list é
-- bloqueado, e que o e-mail do stakeholder (já cadastrado) segue permitido.
--
-- Execução: supabase db query --linked --file supabase/tests/be_m12_restrict_signup.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada (nem em auth.users).

BEGIN;

DO $test$
DECLARE
  v_blocked   boolean;
  v_new_id    uuid;
BEGIN
  -- CASO 1: e-mail fora da allow-list é bloqueado antes de qualquer INSERT.
  v_blocked := false;
  BEGIN
    INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'attacker@example.com');
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: cadastro com e-mail fora da allow-list deveria ter sido bloqueado';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'attacker@example.com') THEN
    RAISE EXCEPTION 'CASO 1b FALHOU: linha não deveria ter sido inserida em auth.users';
  END IF;

  -- CASO 2: e-mail do stakeholder (allow-list) passa pelo trigger sem erro —
  -- simulado com um e-mail equivalente (case-insensitive) mas id novo, só para
  -- confirmar que o trigger deixa passar; ROLLBACK no fim desfaz tudo mesmo assim.
  v_new_id := gen_random_uuid();
  INSERT INTO auth.users (id, email) VALUES (v_new_id, 'LeandroSegheto17@gmail.com');

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_new_id) THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: e-mail da allow-list (case-insensitive) deveria ter passado';
  END IF;

  RAISE NOTICE 'BE-M-12 (restrict signup): TODOS OS 2 CASOS PASSARAM';
END;
$test$;

SELECT 'BE-M-12 restrict signup: PASS' AS result;

ROLLBACK;
