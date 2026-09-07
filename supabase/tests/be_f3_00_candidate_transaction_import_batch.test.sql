-- BE-F3-00 — Testes de `public.candidate_transaction`/`public.import_batch`
-- (SDD.md Seção 5.2) e do mecanismo de confirmação explícita
-- (`confirm_candidate_transaction`/`discard_candidate_transaction`). Roda via
-- RLS real (SET LOCAL ROLE authenticated + request.jwt.claims simulado, mesmo
-- padrão de BE-M-11/BE-REF-02) — nunca como owner/postgres, porque o critério
-- de aceite é justamente "nenhuma promoção sem passar pela RPC", algo que só
-- é observável testando sob RLS real.
--
-- Usa 2 usuários sintéticos reais em auth.users (mesmo padrão de BE-REF-02:
-- allow-list temporária de BE-M-12 + INSERT direto, desfeitos pelo ROLLBACK
-- final) — precisa de v_attacker "de verdade" (não só um uuid nunca visto,
-- diferente de BE-M-11) porque CASO 6 exige uma conta REAL pertencente a
-- outro usuário para provar a validação de ownership de FK dentro da própria
-- RPC (G-19, SECURITY DEFINER bypassa RLS, então tem que reimplementar a
-- mesma checagem no corpo da função).
--
-- Cobertura exigida (item 6 do prompt da tarefa):
--   CASO 1 — isolamento cross-user (SELECT)
--   CASO 2 — bypass via INSERT direto "fingindo" confirmação já feita (RLS nega)
--   CASO 3 — bypass via UPDATE direto de status (sem policy de UPDATE, RLS nega)
--   CASO 4 — confirm_candidate_transaction em candidato de OUTRO usuário (nega)
--   CASO 5 — confirm_candidate_transaction com FK final de OUTRO usuário (nega, G-19)
--   CASO 6 — fluxo legítimo completo via a RPC (sucesso)
--   CASO 7 — dupla confirmação do mesmo candidato (nega, já não está pending)
--   CASO 8 — discard_candidate_transaction (fluxo legítimo) + confirmar depois de descartado (nega)
--   CASO 9 — DELETE só permitido enquanto pending
--
-- Execução: supabase db query --linked --file supabase/tests/be_f3_00_candidate_transaction_import_batch.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user           uuid := gen_random_uuid(); -- usuário sintético "dono", real em auth.users só nesta transação
  v_attacker       uuid := gen_random_uuid(); -- 2º usuário sintético real, precisa de conta própria (CASO 5)
  v_acc            uuid;
  v_cat            uuid;
  v_pm             uuid;
  v_attacker_acc   uuid;
  v_manual_txn     uuid;
  v_batch          uuid;
  v_cand_confirm   uuid;
  v_cand_bad_fk    uuid;
  v_cand_discard   uuid;
  v_cand_delete    uuid;
  v_new_txn        uuid;
  v_status         public.candidate_transaction_status;
  v_confirmed_at   timestamptz;
  v_discarded_at   timestamptz;
  v_result_txn_id  uuid;
  v_balance_before bigint;
  v_balance_after  bigint;
  v_count          integer;
  v_caught         boolean;
  v_sqlstate       text;
BEGIN
  -- ===================== Fixtures (como postgres, ignora RLS) =====================

  INSERT INTO public.allowed_signup_emails (email, note) VALUES
    ('test-f300-user@example.com', 'BE-F3-00 — usuário sintético dono, só dentro desta transação de teste'),
    ('test-f300-attacker@example.com', 'BE-F3-00 — usuário sintético atacante, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES
    (v_user, 'test-f300-user@example.com'),
    (v_attacker, 'test-f300-attacker@example.com');

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user, 'TEST_ACC_F300', 'checking', 'BRL', 100000)
  RETURNING id INTO v_acc;

  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user, 'TEST_CAT_F300', 'expense', false)
  RETURNING id INTO v_cat;

  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user, v_acc, 'pix', 'TEST_PM_F300')
  RETURNING id INTO v_pm;

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_attacker, 'TEST_ACC_F300_ATTACKER', 'checking', 'BRL', 50000)
  RETURNING id INTO v_attacker_acc;

  -- Saldo ANTES de qualquer lançamento (manual ou via RPC) — usado na
  -- asserção final de saldo pós-confirmação.
  SELECT current_balance_cents INTO v_balance_before FROM public.accounts WHERE id = v_acc;

  -- Lançamento manual pré-existente de v_user, usado no CASO 2 (bypass) como
  -- "resultado" fabricado por um client malicioso.
  INSERT INTO public.transactions (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user, v_acc, v_pm, v_cat, 'expense', 1000, current_date)
  RETURNING id INTO v_manual_txn;

  -- ===================== Assume identidade de v_user (RLS real) =====================

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user::text, 'app_email_mfa_verified', 'true')::text,
    true);

  INSERT INTO public.import_batch (user_id, source, status)
  VALUES (v_user, 'import', 'ready_for_review')
  RETURNING id INTO v_batch;

  INSERT INTO public.candidate_transaction (user_id, import_batch_id, source, raw_payload)
  VALUES (v_user, v_batch, 'import', jsonb_build_object('raw_description', 'MERCADO TEST', 'raw_amount', 4321))
  RETURNING id INTO v_cand_confirm;

  INSERT INTO public.candidate_transaction (user_id, source, raw_payload)
  VALUES (v_user, 'ocr', jsonb_build_object('raw_description', 'RECIBO TEST'))
  RETURNING id INTO v_cand_bad_fk;

  INSERT INTO public.candidate_transaction (user_id, import_batch_id, source, raw_payload)
  VALUES (v_user, v_batch, 'import', jsonb_build_object('raw_description', 'DUPLICATA TEST'))
  RETURNING id INTO v_cand_discard;

  INSERT INTO public.candidate_transaction (user_id, source, raw_payload)
  VALUES (v_user, 'audio', jsonb_build_object('transcript', 'cancelei antes de confirmar'))
  RETURNING id INTO v_cand_delete;

  RAISE NOTICE 'BE-F3-00 (fixtures + INSERT legítimo de candidate_transaction/import_batch): OK';

  -- ===================== CASO 2: bypass via INSERT já "confirmado" =====================
  -- Client malicioso tenta criar a linha já como se tivesse passado por
  -- confirmação (status/confirmed_at/resulting_transaction_id preenchidos na
  -- própria criação) — a policy de INSERT exige status='pending' e os 3
  -- campos de resultado nulos, então isso deve ser negado pela RLS.

  v_caught := false;
  BEGIN
    INSERT INTO public.candidate_transaction (user_id, source, status, confirmed_at, resulting_transaction_id)
    VALUES (v_user, 'ocr', 'confirmed', now(), v_manual_txn);
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
  END;

  IF NOT v_caught THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 2 FALHOU: INSERT direto "fingindo" confirmação deveria ser negado pela RLS, mas foi aceito';
  END IF;
  RAISE NOTICE 'BE-F3-00 CASO 2 (bypass via INSERT já confirmado, sqlstate=%): NEGADO CORRETAMENTE', v_sqlstate;

  -- ===================== CASO 3: bypass via UPDATE direto de status =====================
  -- candidate_transaction não tem NENHUMA policy de UPDATE para authenticated
  -- — RLS nega por padrão (0 linhas afetadas, sem exception, mesmo padrão de
  -- BE-M-11 para tabela sem policy de UPDATE aplicável ao caso).

  UPDATE public.candidate_transaction
    SET status = 'confirmed', confirmed_at = now()
    WHERE id = v_cand_confirm;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count <> 0 THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 3 FALHOU: UPDATE direto de status deveria afetar 0 linhas (sem policy de UPDATE), afetou %', v_count;
  END IF;
  RAISE NOTICE 'BE-F3-00 CASO 3 (bypass via UPDATE direto de status): NEGADO CORRETAMENTE (0 linhas afetadas)';

  -- ===================== CASO 5: confirm com FK final de OUTRO usuário =====================
  -- v_user tenta confirmar o PRÓPRIO candidato (v_cand_bad_fk) mas informando
  -- uma conta que pertence a v_attacker — deve ser negado dentro do corpo da
  -- RPC (G-19), mesmo sendo o dono legítimo do candidato.

  v_caught := false;
  BEGIN
    PERFORM public.confirm_candidate_transaction(
      v_cand_bad_fk, v_attacker_acc, v_pm, v_cat, 'expense', 2000, current_date, 'teste FK alheia'
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
  END;

  IF NOT v_caught THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 5 FALHOU: confirm_candidate_transaction deveria rejeitar account_id de outro usuário';
  END IF;
  IF v_sqlstate <> '42501' THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 5 FALHOU: sqlstate esperado 42501 (insufficient_privilege), obtido %', v_sqlstate;
  END IF;
  RAISE NOTICE 'BE-F3-00 CASO 5 (confirm com FK de outro usuário): NEGADO CORRETAMENTE (42501)';

  -- Confirma que v_cand_bad_fk continua pending (a tentativa acima não deixou resíduo).
  SELECT status INTO v_status FROM public.candidate_transaction WHERE id = v_cand_bad_fk;
  IF v_status <> 'pending' THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 5 FALHOU: v_cand_bad_fk deveria continuar pending após tentativa rejeitada, está %', v_status;
  END IF;

  -- ===================== CASO 6: fluxo legítimo completo via a RPC =====================

  SELECT public.confirm_candidate_transaction(
    v_cand_confirm, v_acc, v_pm, v_cat, 'expense', 4321, current_date, 'Mercado (confirmado via voz/OCR/importação)'
  ) INTO v_new_txn;

  SELECT status, confirmed_at, resulting_transaction_id
    INTO v_status, v_confirmed_at, v_result_txn_id
    FROM public.candidate_transaction WHERE id = v_cand_confirm;

  IF v_status <> 'confirmed' THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 6 FALHOU: candidate_transaction deveria estar confirmed após a RPC, está %', v_status;
  END IF;
  IF v_confirmed_at IS NULL THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 6 FALHOU: candidate_transaction.confirmed_at deveria estar gravado (RNF-08)';
  END IF;
  IF v_result_txn_id IS DISTINCT FROM v_new_txn THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 6 FALHOU: resulting_transaction_id (%) deveria apontar para a transaction criada (%)', v_result_txn_id, v_new_txn;
  END IF;

  PERFORM 1 FROM public.transactions
    WHERE id = v_new_txn
      AND import_staging_id = v_cand_confirm
      AND confirmed_at IS NOT NULL
      AND source = 'import'
      AND amount_cents = 4321
      AND account_id = v_acc;
  IF NOT FOUND THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 6 FALHOU: transaction gerada não tem os campos esperados (import_staging_id/confirmed_at/source/amount_cents/account_id)';
  END IF;

  RAISE NOTICE 'BE-F3-00 CASO 6 (fluxo legítimo de confirmação via RPC): PASSOU';

  -- ===================== CASO 7: dupla confirmação do mesmo candidato =====================

  v_caught := false;
  BEGIN
    PERFORM public.confirm_candidate_transaction(
      v_cand_confirm, v_acc, v_pm, v_cat, 'expense', 4321, current_date, 'segunda tentativa'
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
  END;

  IF NOT v_caught THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 7 FALHOU: 2ª confirmação do mesmo candidato deveria ser rejeitada';
  END IF;
  IF v_sqlstate <> '23001' THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 7 FALHOU: sqlstate esperado 23001 (restrict_violation), obtido %', v_sqlstate;
  END IF;
  RAISE NOTICE 'BE-F3-00 CASO 7 (dupla confirmação): NEGADO CORRETAMENTE (23001)';

  -- ===================== CASO 8: discard + tentativa de confirmar depois =====================

  PERFORM public.discard_candidate_transaction(v_cand_discard);

  SELECT status, discarded_at INTO v_status, v_discarded_at FROM public.candidate_transaction WHERE id = v_cand_discard;
  IF v_status <> 'discarded' OR v_discarded_at IS NULL THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 8 FALHOU: candidate_transaction deveria estar discarded com discarded_at gravado, status=%, discarded_at=%', v_status, v_discarded_at;
  END IF;

  v_caught := false;
  BEGIN
    PERFORM public.confirm_candidate_transaction(
      v_cand_discard, v_acc, v_pm, v_cat, 'expense', 999, current_date, 'não deveria confirmar'
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
  END;
  IF NOT v_caught OR v_sqlstate <> '23001' THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 8 FALHOU: confirmar candidato descartado deveria ser rejeitado com 23001, caught=%, sqlstate=%', v_caught, v_sqlstate;
  END IF;
  RAISE NOTICE 'BE-F3-00 CASO 8 (discard_candidate_transaction + confirmar depois de descartado): PASSOU';

  -- ===================== CASO 9: DELETE só permitido enquanto pending =====================

  DELETE FROM public.candidate_transaction WHERE id = v_cand_delete;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 9 FALHOU: DELETE de candidato ainda pending deveria remover 1 linha, removeu %', v_count;
  END IF;

  DELETE FROM public.candidate_transaction WHERE id = v_cand_confirm; -- já confirmed
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 9 FALHOU: DELETE de candidato já confirmed deveria afetar 0 linhas (preserva auditoria RNF-08), afetou %', v_count;
  END IF;
  RAISE NOTICE 'BE-F3-00 CASO 9 (DELETE só permitido enquanto pending): PASSOU';

  RESET ROLE;

  -- ===================== Saldo da conta refletindo a confirmação (apply_transaction_effect) =====================

  SELECT current_balance_cents INTO v_balance_after FROM public.accounts WHERE id = v_acc;
  IF v_balance_after <> v_balance_before - 1000 - 4321 THEN
    RAISE EXCEPTION 'CASO 6 FALHOU: saldo da conta deveria refletir o manual (1000) + o confirmado via RPC (4321), esperado %, obtido %',
      v_balance_before - 1000 - 4321, v_balance_after;
  END IF;
  RAISE NOTICE 'BE-F3-00 (saldo pós-confirmação via apply_transaction_effect): PASSOU';

  -- ===================== CASO 4: confirm em candidato de OUTRO usuário =====================
  -- v_attacker tenta confirmar v_cand_bad_fk (dono real = v_user).

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_attacker::text, 'app_email_mfa_verified', 'true')::text,
    true);

  v_caught := false;
  BEGIN
    PERFORM public.confirm_candidate_transaction(
      v_cand_bad_fk, v_attacker_acc, NULL, NULL, 'expense', 100, current_date, 'ataque'
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
  END;

  IF NOT v_caught THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 4 FALHOU: attacker conseguiu confirmar candidato de outro usuário';
  END IF;
  IF v_sqlstate <> '42501' THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 4 FALHOU: sqlstate esperado 42501 (insufficient_privilege), obtido %', v_sqlstate;
  END IF;

  -- ===================== CASO 1: isolamento cross-user (SELECT) =====================

  SELECT count(*) INTO v_count FROM public.candidate_transaction WHERE id IN (v_cand_bad_fk, v_cand_confirm, v_cand_discard);
  IF v_count <> 0 THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 1 FALHOU: attacker conseguiu SELECT em candidate_transaction de outro usuário (% linha(s))', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.import_batch WHERE id = v_batch;
  IF v_count <> 0 THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 1 FALHOU: attacker conseguiu SELECT em import_batch de outro usuário';
  END IF;

  RESET ROLE;

  RAISE NOTICE 'BE-F3-00 CASO 1/4 (isolamento cross-user, SELECT + confirm): PASSARAM';

  -- Confirma que v_cand_bad_fk continua pending (nenhuma das 2 tentativas de
  -- ataque acima — CASO 4 e CASO 5 — deixou resíduo).
  SELECT status INTO v_status FROM public.candidate_transaction WHERE id = v_cand_bad_fk;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'RESÍDUO: v_cand_bad_fk deveria continuar pending após os 2 ataques rejeitados (CASO 4/5), está %', v_status;
  END IF;

  RAISE NOTICE 'BE-F3-00 (candidate_transaction/import_batch + confirm/discard_candidate_transaction): TODOS OS 9 CASOS PASSARAM';
END;
$test$;

SELECT 'BE-F3-00 (candidate_transaction/import_batch, confirm/discard RPC): PASS' AS result;

ROLLBACK;
