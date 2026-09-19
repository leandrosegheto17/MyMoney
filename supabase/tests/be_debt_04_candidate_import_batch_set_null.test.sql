-- BE-DEBT-04 — excluir import_batch não apaga candidate_transaction (SET NULL).
-- Cenário: lote -> candidato -> confirmar via RPC -> excluir lote -> candidato
-- persiste com import_batch_id NULL e campos de auditoria preservados.
-- Execução: supabase db query --linked --file supabase/tests/be_debt_04_candidate_import_batch_set_null.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user   uuid := gen_random_uuid();
  v_acc    uuid;
  v_cat    uuid;
  v_pm     uuid;
  v_batch  uuid;
  v_cand   uuid;
  v_cand2  uuid;
  v_txn    uuid;
  r        record;
BEGIN
  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-debt04-user@example.com', 'BE-DEBT-04 — usuário sintético, só nesta transação');
  INSERT INTO auth.users (id, email) VALUES (v_user, 'test-debt04-user@example.com');

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user, 'TEST_ACC_DEBT04', 'checking', 'BRL', 100000) RETURNING id INTO v_acc;
  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user, 'TEST_CAT_DEBT04', 'expense', false) RETURNING id INTO v_cat;
  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user, v_acc, 'pix', 'TEST_PM_DEBT04') RETURNING id INTO v_pm;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user::text, 'app_email_mfa_verified', 'true')::text, true);

  INSERT INTO public.import_batch (user_id, source, status)
  VALUES (v_user, 'import', 'ready_for_review') RETURNING id INTO v_batch;

  INSERT INTO public.candidate_transaction (user_id, import_batch_id, source, raw_payload)
  VALUES (v_user, v_batch, 'import', jsonb_build_object('raw_description', 'DEBT04 CONFIRMED'))
  RETURNING id INTO v_cand;
  INSERT INTO public.candidate_transaction (user_id, import_batch_id, source, raw_payload)
  VALUES (v_user, v_batch, 'import', jsonb_build_object('raw_description', 'DEBT04 PENDING'))
  RETURNING id INTO v_cand2;

  v_txn := public.confirm_candidate_transaction(v_cand, v_acc, v_pm, v_cat, 'expense', 1234, current_date, 'DEBT04');

  DELETE FROM public.import_batch WHERE id = v_batch;

  SELECT * INTO r FROM public.candidate_transaction WHERE id = v_cand;
  IF NOT FOUND THEN
    RESET ROLE;
    RAISE EXCEPTION 'FALHOU: candidato confirmado foi apagado junto com o lote';
  END IF;
  IF r.import_batch_id IS NOT NULL OR r.status <> 'confirmed' OR r.confirmed_at IS NULL
     OR r.resulting_transaction_id IS DISTINCT FROM v_txn
     OR r.raw_payload->>'raw_description' <> 'DEBT04 CONFIRMED' THEN
    RESET ROLE;
    RAISE EXCEPTION 'FALHOU: candidato confirmado não preservou campos (%)', to_jsonb(r);
  END IF;

  SELECT * INTO r FROM public.candidate_transaction WHERE id = v_cand2;
  IF NOT FOUND OR r.import_batch_id IS NOT NULL THEN
    RESET ROLE;
    RAISE EXCEPTION 'FALHOU: candidato pendente deveria existir com import_batch_id NULL';
  END IF;

  RESET ROLE;
  RAISE NOTICE 'BE-DEBT-04: PASSOU';
END;
$test$;

SELECT 'BE-DEBT-04 (import_batch ON DELETE SET NULL): PASS' AS result;

ROLLBACK;
