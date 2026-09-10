-- BE-F3-08 — Testes dos jobs diários de expurgo de dado transitório
-- (ADR-011). Cobre: (1) infra/agendamento (mesmo padrão de
-- `be_m10_backup_export.test.sql`), (2) fronteira de retenção de
-- `CandidateTransaction` nos dois sentidos (dentro do prazo permanece, além
-- do prazo é removido) para os 3 casos distintos da regra (descartado,
-- pending com ImportBatch, pending avulso sem lote), (3) confirmado NUNCA é
-- removido por idade (retenção indefinida, ADR-011), (4) fronteira de
-- expurgo de objetos do bucket `exports` (BE-F3-07) nos dois sentidos.
--
-- Roda como `postgres` (superuser/owner), não sob RLS simulada — os jobs
-- desta tarefa são administrativos/cross-usuário por natureza (mesmo
-- raciocínio de BE-M-10: um cron job não tem "usuário logado"), e as duas
-- funções são SECURITY DEFINER. `candidate_transaction`/`import_batch` são
-- povoados via `SET LOCAL ROLE authenticated` (mesmo padrão de
-- `be_f3_00_candidate_transaction_import_batch.test.sql`) só para respeitar
-- as policies de INSERT; a manipulação de `created_at`/`discarded_at` para
-- simular idade é feita depois, de volta como `postgres` (bypassa RLS,
-- necessário para "voltar no tempo" um valor que a policy normal nunca
-- deixaria o client escrever).
--
-- Execução: supabase db query --linked --file supabase/tests/be_f3_08_data_retention_purge_jobs.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user             uuid := gen_random_uuid();
  v_schedule         text;
  v_active           boolean;
  v_rls              boolean;
  v_count            int;
  v_log_id           uuid;
  v_blocked          boolean;

  v_batch_old        uuid;
  v_batch_recent     uuid;

  v_cand_discard_old uuid;
  v_cand_discard_new uuid;
  v_cand_pending_batch_old   uuid;
  v_cand_pending_batch_new  uuid;
  v_cand_pending_loose_old  uuid;
  v_cand_pending_loose_new  uuid;
  v_cand_confirmed_old      uuid;
  v_confirmed_txn_id        uuid;

  v_deleted          int;
  v_remaining        text[];
BEGIN
  -- ===================== Fixtures de identidade (como postgres) =====================

  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-f308-user@example.com', 'BE-F3-08 — usuário sintético, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user, 'test-f308-user@example.com');

  -- =============================================================================
  -- CASO 1 (DIR-31/32): infra — extensão, tabela de log, agendamento pg_cron.
  -- =============================================================================

  SELECT count(*) INTO v_count FROM pg_extension WHERE extname = 'pg_net';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: extensão pg_net não está habilitada';
  END IF;

  SELECT schedule, active INTO v_schedule, v_active
    FROM cron.job WHERE jobname = 'be-f3-08-daily-data-retention-purge';
  IF v_schedule IS NULL OR v_schedule <> '30 3 * * *' OR v_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: job be-f3-08-daily-data-retention-purge ausente/schedule inesperado (%)', v_schedule;
  END IF;

  SELECT schedule, active INTO v_schedule, v_active
    FROM cron.job WHERE jobname = 'be-f3-08-data-retention-health-check';
  IF v_schedule IS NULL OR v_schedule <> '15 */6 * * *' OR v_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: job be-f3-08-data-retention-health-check ausente/schedule inesperado (%)', v_schedule;
  END IF;

  PERFORM 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'data_retention_purge_log'
      AND column_name IN ('job_name', 'started_at', 'finished_at', 'status', 'detail', 'error_message')
    HAVING count(*) = 6;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: data_retention_purge_log não tem todas as colunas esperadas';
  END IF;

  SELECT relrowsecurity INTO v_rls FROM pg_class WHERE relname = 'data_retention_purge_log';
  IF v_rls IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: data_retention_purge_log sem RLS habilitada';
  END IF;

  SELECT count(*) INTO v_count FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'data_retention_purge_log';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: data_retention_purge_log tem % policy(ies) — esperado 0 (deny-all)', v_count;
  END IF;

  INSERT INTO public.data_retention_purge_log (job_name, started_at, finished_at, status, detail)
  VALUES ('TEST', now(), now(), 'success', '{}'::jsonb)
  RETURNING id INTO v_log_id;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid()::text, 'app_email_mfa_verified', 'true')::text,
    true);
  PERFORM 1 FROM public.data_retention_purge_log WHERE id = v_log_id;
  IF FOUND THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 1 FALHOU: authenticated conseguiu SELECT em data_retention_purge_log (deveria ser negado)';
  END IF;
  RESET ROLE;

  RAISE NOTICE 'CASO 1 (infra/agendamento/log deny-all): OK';

  -- =============================================================================
  -- CASO 2 (DIR-32): trigger/healthcheck são SECURITY DEFINER e fail-safe sem
  -- os secrets do Vault (nunca derruba o cron job por exceção não tratada).
  -- =============================================================================

  PERFORM 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'trigger_data_retention_purge' AND p.prosecdef;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: trigger_data_retention_purge() ausente ou não SECURITY DEFINER';
  END IF;

  PERFORM 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'check_data_retention_health' AND p.prosecdef;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: check_data_retention_health() ausente ou não SECURITY DEFINER';
  END IF;

  PERFORM public.trigger_data_retention_purge();
  PERFORM public.check_data_retention_health();

  RAISE NOTICE 'CASO 2 (trigger/healthcheck fail-safe sem Vault): OK';

  -- =============================================================================
  -- Fixtures de candidate_transaction/import_batch (via RLS real, como v_user)
  -- =============================================================================

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user::text, 'app_email_mfa_verified', 'true')::text,
    true);

  INSERT INTO public.import_batch (user_id, source, status) VALUES (v_user, 'import', 'completed') RETURNING id INTO v_batch_old;
  INSERT INTO public.import_batch (user_id, source, status) VALUES (v_user, 'import', 'ready_for_review') RETURNING id INTO v_batch_recent;

  INSERT INTO public.candidate_transaction (user_id, import_batch_id, source, raw_payload)
    VALUES (v_user, v_batch_old, 'import', '{}'::jsonb) RETURNING id INTO v_cand_discard_old;
  INSERT INTO public.candidate_transaction (user_id, import_batch_id, source, raw_payload)
    VALUES (v_user, v_batch_old, 'import', '{}'::jsonb) RETURNING id INTO v_cand_discard_new;
  INSERT INTO public.candidate_transaction (user_id, import_batch_id, source, raw_payload)
    VALUES (v_user, v_batch_old, 'import', '{}'::jsonb) RETURNING id INTO v_cand_pending_batch_old;
  INSERT INTO public.candidate_transaction (user_id, import_batch_id, source, raw_payload)
    VALUES (v_user, v_batch_recent, 'import', '{}'::jsonb) RETURNING id INTO v_cand_pending_batch_new;
  INSERT INTO public.candidate_transaction (user_id, source, raw_payload)
    VALUES (v_user, 'audio', '{}'::jsonb) RETURNING id INTO v_cand_pending_loose_old;
  INSERT INTO public.candidate_transaction (user_id, source, raw_payload)
    VALUES (v_user, 'ocr', '{}'::jsonb) RETURNING id INTO v_cand_pending_loose_new;
  INSERT INTO public.candidate_transaction (user_id, source, raw_payload)
    VALUES (v_user, 'ocr', '{}'::jsonb) RETURNING id INTO v_cand_confirmed_old;

  -- discard_candidate_transaction grava discarded_at=now() — ajustado "para o
  -- passado" depois, como postgres (RLS real não permite UPDATE direto).
  PERFORM public.discard_candidate_transaction(v_cand_discard_old);
  PERFORM public.discard_candidate_transaction(v_cand_discard_new);

  RESET ROLE;

  -- "Volta no tempo" das colunas relevantes (só possível como postgres,
  -- bypassando RLS — nenhuma policy de UPDATE existe para authenticated,
  -- por design de BE-F3-00/DIR-20).
  UPDATE public.import_batch SET created_at = now() - interval '31 days' WHERE id = v_batch_old;
  UPDATE public.import_batch SET created_at = now() - interval '5 days'  WHERE id = v_batch_recent;

  UPDATE public.candidate_transaction SET discarded_at = now() - interval '31 days' WHERE id = v_cand_discard_old;
  UPDATE public.candidate_transaction SET discarded_at = now() - interval '5 days'  WHERE id = v_cand_discard_new;
  UPDATE public.candidate_transaction SET created_at   = now() - interval '31 days' WHERE id = v_cand_pending_loose_old;
  UPDATE public.candidate_transaction SET created_at   = now() - interval '5 days'  WHERE id = v_cand_pending_loose_new;

  -- Candidato "confirmado há muito tempo" — não deve ser tocado pelo job
  -- mesmo sendo o mais antigo de todos (ADR-011: retenção indefinida para
  -- confirmado, segue a Transaction gerada). Confirma via a RPC real
  -- (SET LOCAL ROLE authenticated de novo) e depois envelhece confirmed_at.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user::text, 'app_email_mfa_verified', 'true')::text,
    true);

  DECLARE
    v_acc uuid;
    v_cat uuid;
    v_pm  uuid;
  BEGIN
    INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
      VALUES (v_user, 'TEST_ACC_F308', 'checking', 'BRL', 10000) RETURNING id INTO v_acc;
    INSERT INTO public.categories (user_id, name, kind, is_system_default)
      VALUES (v_user, 'TEST_CAT_F308', 'expense', false) RETURNING id INTO v_cat;
    INSERT INTO public.payment_methods (user_id, account_id, type, name)
      VALUES (v_user, v_acc, 'pix', 'TEST_PM_F308') RETURNING id INTO v_pm;

    v_confirmed_txn_id := public.confirm_candidate_transaction(
      v_cand_confirmed_old, v_acc, v_pm, v_cat, 'expense', 500, current_date
    );
  END;

  RESET ROLE;

  UPDATE public.candidate_transaction SET confirmed_at = now() - interval '400 days' WHERE id = v_cand_confirmed_old;

  RAISE NOTICE 'Fixtures de candidate_transaction/import_batch (fronteira 30 dias): OK';

  -- =============================================================================
  -- CASO 3 (fronteira, discarded): >30 dias é removido, <=30 dias permanece.
  -- CASO 4 (fronteira, pending com ImportBatch): idem, contado da criação do lote.
  -- CASO 5 (fronteira, pending avulso sem lote): idem, contado do created_at próprio.
  -- CASO 6: confirmado nunca é removido, mesmo com 400 dias de idade.
  -- =============================================================================

  v_deleted := public.purge_expired_candidate_transactions(30);

  -- Removidos (4 esperados: discard_old, pending_batch_old, pending_loose_old
  -- — pending_batch_old herda a idade do lote de 31 dias).
  PERFORM 1 FROM public.candidate_transaction WHERE id = v_cand_discard_old;
  IF FOUND THEN RAISE EXCEPTION 'CASO 3 FALHOU: candidato descartado há 31 dias não foi removido'; END IF;

  PERFORM 1 FROM public.candidate_transaction WHERE id = v_cand_pending_batch_old;
  IF FOUND THEN RAISE EXCEPTION 'CASO 4 FALHOU: candidato pending com ImportBatch de 31 dias não foi removido'; END IF;

  PERFORM 1 FROM public.candidate_transaction WHERE id = v_cand_pending_loose_old;
  IF FOUND THEN RAISE EXCEPTION 'CASO 5 FALHOU: candidato pending avulso (created_at 31 dias) não foi removido'; END IF;

  -- Mantidos (dentro do prazo).
  PERFORM 1 FROM public.candidate_transaction WHERE id = v_cand_discard_new;
  IF NOT FOUND THEN RAISE EXCEPTION 'CASO 3 FALHOU: candidato descartado há 5 dias foi removido incorretamente'; END IF;

  PERFORM 1 FROM public.candidate_transaction WHERE id = v_cand_pending_batch_new;
  IF NOT FOUND THEN RAISE EXCEPTION 'CASO 4 FALHOU: candidato pending com ImportBatch de 5 dias foi removido incorretamente'; END IF;

  PERFORM 1 FROM public.candidate_transaction WHERE id = v_cand_pending_loose_new;
  IF NOT FOUND THEN RAISE EXCEPTION 'CASO 5 FALHOU: candidato pending avulso (created_at 5 dias) foi removido incorretamente'; END IF;

  -- Confirmado — retenção indefinida (ADR-011), nunca removido por idade.
  PERFORM 1 FROM public.candidate_transaction WHERE id = v_cand_confirmed_old;
  IF NOT FOUND THEN RAISE EXCEPTION 'CASO 6 FALHOU: candidato confirmado (400 dias) foi removido — retenção deveria ser indefinida'; END IF;

  IF v_deleted <> 3 THEN
    RAISE EXCEPTION 'CASO 3/4/5 FALHARAM: esperado 3 linhas removidas, função retornou %', v_deleted;
  END IF;

  RAISE NOTICE 'CASO 3/4/5/6 (fronteira de retenção de CandidateTransaction, 2 sentidos + confirmado indefinido): OK';

  -- Idempotência: rodar de novo não remove nada a mais (as linhas expiradas já saíram).
  v_deleted := public.purge_expired_candidate_transactions(30);
  IF v_deleted <> 0 THEN
    RAISE EXCEPTION 'CASO 3b FALHOU: segunda execução deveria remover 0 linhas, removeu %', v_deleted;
  END IF;

  -- =============================================================================
  -- CASO 7 (fronteira, exports do bucket `exports`, BE-F3-07): >24h é
  -- sinalizado para remoção, <=24h permanece. Objeto de outro bucket
  -- (mesma idade "expirada") nunca é sinalizado — isolamento por bucket.
  -- =============================================================================

  INSERT INTO storage.buckets (id, name, public) VALUES ('TEST_F308_OTHER_BUCKET', 'TEST_F308_OTHER_BUCKET', false)
    ON CONFLICT (id) DO NOTHING;

  INSERT INTO storage.objects (bucket_id, name, owner, created_at, updated_at, metadata)
  VALUES
    ('exports', v_user::text || '/old-export.csv', v_user, now() - interval '25 hours', now() - interval '25 hours', '{}'::jsonb),
    ('exports', v_user::text || '/recent-export.csv', v_user, now() - interval '1 hour', now() - interval '1 hour', '{}'::jsonb),
    ('TEST_F308_OTHER_BUCKET', v_user::text || '/old-unrelated.bin', v_user, now() - interval '25 hours', now() - interval '25 hours', '{}'::jsonb);

  SELECT array_agg(name) INTO v_remaining FROM public.list_expired_export_objects(now() - interval '24 hours');

  IF NOT (v_remaining @> ARRAY[v_user::text || '/old-export.csv']) THEN
    RAISE EXCEPTION 'CASO 7 FALHOU: export de 25h não foi sinalizado como expirado';
  END IF;
  IF v_remaining @> ARRAY[v_user::text || '/recent-export.csv'] THEN
    RAISE EXCEPTION 'CASO 7 FALHOU: export de 1h foi sinalizado como expirado incorretamente';
  END IF;
  IF v_remaining @> ARRAY[v_user::text || '/old-unrelated.bin'] THEN
    RAISE EXCEPTION 'CASO 7 FALHOU: objeto de outro bucket foi sinalizado (isolamento por bucket violado)';
  END IF;

  RAISE NOTICE 'CASO 7 (fronteira de expurgo de exports, 2 sentidos + isolamento por bucket): OK';

  RAISE NOTICE 'BE-F3-08 (jobs de expurgo de dado transitório): TODOS OS 7 CASOS PASSARAM';
END;
$test$;

SELECT 'BE-F3-08 data retention purge jobs: PASS' AS result;

ROLLBACK;
