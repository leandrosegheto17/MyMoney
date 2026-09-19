-- BE-DEBT-02 — funções SECURITY DEFINER de cron não são executáveis por
-- anon/authenticated/PUBLIC, mas continuam executáveis por service_role
-- (Edge Functions) e pelo owner (pg_cron).
-- Execução: supabase db query --linked --file supabase/tests/be_debt_02_revoke_execute_cron_functions.test.sql
-- Somente leitura de catálogo; nenhuma linha alterada.

DO $test$
DECLARE
  v_fn   text;
  v_role text;
  v_fns  text[] := ARRAY[
    'public.trigger_backup_export()',
    'public.check_backup_health()',
    'public.generate_upcoming_invoices()',
    'public.close_due_invoices()',
    'public.trigger_invoice_close()',
    'public.trigger_recurring_generate()',
    'public.generate_recurring_transactions()',
    'public.generate_installment_transactions()',
    'public.trigger_fixed_bill_generate()',
    'public.generate_fixed_bill_transactions()',
    'public.check_fixed_bill_due_alerts()',
    'public.check_budget_alerts()',
    'public.trigger_data_retention_purge()',
    'public.check_data_retention_health()'
  ];
BEGIN
  FOREACH v_fn IN ARRAY v_fns LOOP
    FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_function_privilege(v_role, v_fn, 'EXECUTE') THEN
        RAISE EXCEPTION 'BE-DEBT-02 FALHOU: % ainda tem EXECUTE em %', v_role, v_fn;
      END IF;
    END LOOP;
    IF NOT has_function_privilege('service_role', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'BE-DEBT-02 FALHOU: service_role perdeu EXECUTE em % (Edge Function quebraria)', v_fn;
    END IF;
    RAISE NOTICE 'BE-DEBT-02 %: anon/authenticated negados, service_role mantido', v_fn;
  END LOOP;
END
$test$;
