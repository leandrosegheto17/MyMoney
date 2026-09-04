-- Rollback manual de 20260903230000_be_f2_07_fixed_bill_due_alerts.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>
-- ATENÇÃO: restaura fn_clear_due_transactions ao comportamento indiscriminado
-- pré-BE-F2-07 (volta a promover lançamento de conta fixa pending->cleared
-- automaticamente, perdendo a distinção "vencida" vs. "paga", RF-F2-06 AC2).
-- Só aplicar com ciência explícita do risco (mesmo padrão dos demais
-- rollbacks, G-02).

select cron.unschedule('be-f2-07-fixed-bill-due-alerts');

drop function if exists public.check_fixed_bill_due_alerts();
drop function if exists public.get_fixed_bills_status();

create or replace function public.fn_clear_due_transactions()
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  update public.transactions
  set status = 'cleared'
  where status = 'pending'
    and transaction_date <= (now() at time zone 'America/Sao_Paulo')::date;
end;
$$;

comment on function public.fn_clear_due_transactions() is
  'F1-BE-09: promove transactions.status de pending para cleared quando transaction_date <= hoje (America/Sao_Paulo -- mesma expressão do trigger transactions_set_status, para consistência). SECURITY DEFINER para atualizar linhas de todos os usuários ignorando RLS. Chamada exclusivamente pelo job pg_cron fn-clear-due-transactions (a cada 15 min) -- nunca pelo client (ver REVOKE abaixo).';

alter table public.fixed_bills
  drop column if exists alert_days_before;
