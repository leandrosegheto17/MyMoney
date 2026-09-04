-- BE-F2-06 — Agendamento da Edge Function `fixed-bill-generate` via pg_cron/
-- pg_net, mesmo padrão de `trigger_backup_export()`/BE-M-10,
-- `trigger_invoice_close()`/BE-F2-02 e `trigger_recurring_generate()`/BE-F2-03.
-- Migration separada da 20260903190000 porque a URL/segredo só existem
-- depois do primeiro `supabase functions deploy`.
--
-- URL da Edge Function e segredo compartilhado (`X-Cron-Secret`, autenticação
-- fail-closed) vêm do Supabase Vault (`fixed_bill_generate_edge_function_url`/
-- `fixed_bill_generate_cron_secret`, inseridos fora desta migration
-- versionada via `select vault.create_secret(<valor>, <nome>)`, DIR-30 —
-- segredo nunca commitado no repositório; mesmo segredo já configurado como
-- env var da própria Edge Function via `supabase secrets set`).
--
-- Cadência diária (mesmo racional de invoice-close/recurring-generate: sem
-- requisito de latência, precisa só existir com antecedência dentro do mês
-- pra RF-F2-07, ainda não implementado, ter o que avisar). Horário diferente
-- de backup (03:00)/invoice-close (04:00)/recurring-generate (05:00) para
-- não concorrer.
-- Rollback: supabase/migrations_down/20260903200000_be_f2_06_fixed_bill_generate_cron.down.sql

create or replace function public.trigger_fixed_bill_generate()
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
    from vault.decrypted_secrets where name = 'fixed_bill_generate_edge_function_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'fixed_bill_generate_cron_secret';

  if v_url is null or v_secret is null then
    raise warning 'BE-F2-06: fixed_bill_generate_edge_function_url/fixed_bill_generate_cron_secret ausentes no Vault — job não disparado';
    return;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body    := '{}'::jsonb
  );
end;
$$;

comment on function public.trigger_fixed_bill_generate() is
  'BE-F2-06 — dispara a geração de lançamento previsto de conta fixa (RF-F2-06 '
  'AC1) via pg_net (chamada assíncrona à Edge Function fixed-bill-generate). '
  'Agendada por pg_cron, cadência diária.';

select cron.schedule(
  'be-f2-06-fixed-bill-generate',
  '0 6 * * *', -- diário às 06:00 UTC (backup 03:00, invoice-close 04:00, recurring-generate 05:00 — sem concorrência)
  $$select public.trigger_fixed_bill_generate();$$
);
