-- BE-F2-02 — Agendamento da Edge Function `invoice-close` via pg_cron/pg_net,
-- mesmo padrão de `trigger_backup_export()`/BE-M-10. Migration separada da
-- 20260903130000 porque a URL/segredo só existem depois do primeiro `supabase
-- functions deploy` (mesma ordem de dependência real já usada em BE-M-10: a
-- function precisa existir/ser deployada antes da URL fazer sentido).
--
-- URL da Edge Function e segredo compartilhado (`X-Cron-Secret`, autenticação
-- fail-closed) vêm do Supabase Vault (`invoice_close_edge_function_url`/
-- `invoice_close_cron_secret`, inseridos fora desta migration versionada via
-- `select vault.create_secret(<valor>, <nome>)`, DIR-30 — segredo nunca
-- commitado no repositório; mesmo segredo já configurado como env var da
-- própria Edge Function via `supabase secrets set`).
--
-- Cadência diária (não há requisito de latência — a atribuição de fatura por
-- lançamento, o item mais crítico de RN-01, já é resolvida de forma síncrona
-- pelo trigger de `transactions`, migration 20260903130000; este job só cobre
-- geração antecipada — DIR-13 — e fechamento por status — RF-F2-05 AC3, ambos
-- não urgentes). Horário diferente do backup (03:00 UTC) só para não
-- concorrer no mesmo minuto.
-- Rollback: supabase/migrations_down/20260903140000_be_f2_02_invoice_close_cron.down.sql

create or replace function public.trigger_invoice_close()
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
    from vault.decrypted_secrets where name = 'invoice_close_edge_function_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'invoice_close_cron_secret';

  if v_url is null or v_secret is null then
    raise warning 'BE-F2-02: invoice_close_edge_function_url/invoice_close_cron_secret ausentes no Vault — job não disparado';
    return;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body    := '{}'::jsonb
  );
end;
$$;

comment on function public.trigger_invoice_close() is
  'BE-F2-02 — dispara a geração antecipada (DIR-13) + fechamento de fatura '
  '(RF-F2-05 AC3) via pg_net (chamada assíncrona à Edge Function invoice-close). '
  'Agendada por pg_cron, cadência diária.';

select cron.schedule(
  'be-f2-02-invoice-close',
  '0 4 * * *', -- diário às 04:00 UTC (backup roda às 03:00 — horário diferente, sem concorrência)
  $$select public.trigger_invoice_close();$$
);
