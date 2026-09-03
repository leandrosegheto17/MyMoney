-- Rollback manual de 20260903110000_dr_bloqueio011_fn_clear_due_transactions_cron.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>
-- ATENÇÃO: remove o agendamento que promove transactions.status de pending para
-- cleared (RN-11) a cada 15 min — só aplicar com ciência do efeito.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'fn-clear-due-transactions') then
    perform cron.unschedule('fn-clear-due-transactions');
  end if;
end;
$$;
