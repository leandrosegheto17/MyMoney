-- BE-M-10 — Testes de schema/infra do export lógico diário de backup
-- (ADR-009, DIR-31/32; ADR-011 rotação). A lógica de negócio (dump/
-- criptografia/upload/rotação) é testada separadamente via `deno test` em
-- `supabase/functions/backup-export/lib.test.ts` (16 casos, unitário, sem
-- depender de credenciais reais de storage externo). Este arquivo cobre a
-- parte que só existe no banco: extensão, tabela de log, RLS, funções de
-- disparo e agendamento pg_cron.
--
-- Execução: supabase db query --linked --file supabase/tests/be_m10_backup_export.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_count      int;
  v_schedule   text;
  v_active     boolean;
  v_rls        boolean;
  v_log_id     uuid;
  v_blocked    boolean;
BEGIN
  -- CASO 1 (DIR-31): extensão pg_net habilitada (mecanismo de disparo da Edge
  -- Function a partir do pg_cron).
  SELECT count(*) INTO v_count FROM pg_extension WHERE extname = 'pg_net';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: extensão pg_net não está habilitada';
  END IF;

  -- CASO 2 (DIR-31): job diário agendado, cadência 03:00 UTC todo dia — nunca
  -- semanal (DIR-31 explicitamente proíbe "0 0 * * 0").
  SELECT schedule, active INTO v_schedule, v_active
    FROM cron.job WHERE jobname = 'be-m10-daily-backup-export';
  IF v_schedule IS NULL THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: job be-m10-daily-backup-export não encontrado';
  END IF;
  IF v_schedule <> '0 3 * * *' OR v_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: schedule/active inesperados (%// %)', v_schedule, v_active;
  END IF;

  -- CASO 3 (DIR-32): job de healthcheck agendado, mais frequente que o
  -- limiar de 26h de staleness (garante detecção a tempo).
  SELECT schedule, active INTO v_schedule, v_active
    FROM cron.job WHERE jobname = 'be-m10-backup-health-check';
  IF v_schedule IS NULL THEN
    RAISE EXCEPTION 'CASO 3 FALHOU: job be-m10-backup-health-check não encontrado';
  END IF;
  IF v_schedule <> '0 */6 * * *' OR v_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'CASO 3 FALHOU: schedule/active inesperados (%// %)', v_schedule, v_active;
  END IF;

  -- CASO 4 (DIR-32): tabela de log existe, com as colunas mínimas para
  -- "execução consultável" (status, timestamps, erro).
  PERFORM 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'backup_export_log'
      AND column_name IN ('started_at', 'finished_at', 'status', 'object_key', 'size_bytes', 'error_message')
    HAVING count(*) = 6;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO 4 FALHOU: backup_export_log não tem todas as colunas esperadas';
  END IF;

  -- CASO 5: backup_export_log tem RLS habilitada e SEM nenhuma policy para
  -- anon/authenticated (metadado operacional, não dado de usuário — só
  -- service_role, que ignora RLS, deve conseguir gravar/ler).
  SELECT relrowsecurity INTO v_rls FROM pg_class WHERE relname = 'backup_export_log';
  IF v_rls IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'CASO 5 FALHOU: backup_export_log sem RLS habilitada';
  END IF;

  SELECT count(*) INTO v_count FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'backup_export_log';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'CASO 5 FALHOU: backup_export_log tem % policy(ies) — esperado 0 (deny-all)', v_count;
  END IF;

  -- CASO 5b: confirma deny-all na prática — `authenticated` não lê nem
  -- escreve em backup_export_log, mesmo que uma linha exista.
  INSERT INTO public.backup_export_log (started_at, finished_at, status, object_key, size_bytes)
  VALUES (now(), now(), 'success', 'TEST_KEY_M10', 123)
  RETURNING id INTO v_log_id;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid()::text, 'app_email_mfa_verified', 'true')::text,
    true);

  PERFORM 1 FROM public.backup_export_log WHERE id = v_log_id;
  IF FOUND THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 5b FALHOU: authenticated conseguiu SELECT em backup_export_log (deveria ser negado)';
  END IF;

  v_blocked := false;
  BEGIN
    INSERT INTO public.backup_export_log (started_at, finished_at, status)
    VALUES (now(), now(), 'success');
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 5b FALHOU: authenticated conseguiu INSERT em backup_export_log (deveria ser negado)';
  END IF;

  RESET ROLE;

  -- CASO 6: funções de disparo existem e são SECURITY DEFINER (chamadas por
  -- pg_cron como o dono da função, não como o role que a invoca).
  PERFORM 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'trigger_backup_export' AND p.prosecdef;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO 6 FALHOU: public.trigger_backup_export() ausente ou não é SECURITY DEFINER';
  END IF;

  PERFORM 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'check_backup_health' AND p.prosecdef;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CASO 6 FALHOU: public.check_backup_health() ausente ou não é SECURITY DEFINER';
  END IF;

  -- CASO 7: chamar trigger_backup_export()/check_backup_health() sem os
  -- secrets no Vault não deve lançar exceção (fail-safe — WARNING, "return"),
  -- nunca derrubar o cron job por uma exceção não tratada.
  PERFORM public.trigger_backup_export();
  PERFORM public.check_backup_health();

  RAISE NOTICE 'BE-M-10 (backup export — schema/infra): TODOS OS 7 CASOS PASSARAM';
END;
$test$;

SELECT 'BE-M-10 backup export (schema/infra): PASS' AS result;

ROLLBACK;
