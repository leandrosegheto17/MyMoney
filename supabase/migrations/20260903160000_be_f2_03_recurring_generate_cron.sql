-- BE-F2-03 — Agendamento da Edge Function `recurring-generate` via pg_cron/
-- pg_net, mesmo padrão de `trigger_backup_export()`/BE-M-10 e
-- `trigger_invoice_close()`/BE-F2-02. Migration separada da 20260903150000
-- porque a URL/segredo só existem depois do primeiro `supabase functions
-- deploy` (mesma ordem de dependência já usada em BE-M-10/BE-F2-02).
--
-- URL da Edge Function e segredo compartilhado (`X-Cron-Secret`, autenticação
-- fail-closed) vêm do Supabase Vault (`recurring_generate_edge_function_url`/
-- `recurring_generate_cron_secret`, inseridos fora desta migration versionada
-- via `select vault.create_secret(<valor>, <nome>)`, DIR-30 — segredo nunca
-- commitado no repositório; mesmo segredo já configurado como env var da
-- própria Edge Function via `supabase secrets set`).
--
-- Cadência diária (RF-F2-02 AC1 só exige "sem ação manual", sem requisito de
-- latência — rodar diário garante que o lançamento apareça no mesmo dia do
-- vencimento, mesmo padrão de invoice-close). Horário diferente de backup
-- (03:00 UTC) e invoice-close (04:00 UTC) para não concorrer.
-- Rollback: supabase/migrations_down/20260903160000_be_f2_03_recurring_generate_cron.down.sql

create or replace function public.trigger_recurring_generate()
returns void
language plpgsql
security definer
set search_path to 'public', 'net', 'vault', 'pg_temp'
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'recurring_generate_edge_function_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'recurring_generate_cron_secret';

  if v_url is null or v_secret is null then
    raise warning 'BE-F2-03: recurring_generate_edge_function_url/recurring_generate_cron_secret ausentes no Vault — job não disparado';
    return;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body    := '{}'::jsonb
  );
end;
$$;

comment on function public.trigger_recurring_generate() is
  'BE-F2-03 — dispara a geração mensal de lançamento recorrente (RF-F2-02 AC1) '
  'via pg_net (chamada assíncrona à Edge Function recurring-generate). '
  'Agendada por pg_cron, cadência diária.';

select cron.schedule(
  'be-f2-03-recurring-generate',
  '0 5 * * *', -- diário às 05:00 UTC (backup 03:00, invoice-close 04:00 — sem concorrência)
  $$select public.trigger_recurring_generate();$$
);
