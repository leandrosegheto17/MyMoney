-- BE-M-10 — Export lógico diário de backup (ADR-009, DIR-31/32; ADR-011
-- rotação de 30 snapshots). Verificado antes de escrever qualquer código
-- (Bloqueio 005): `supabase functions list`/`supabase secrets list` não
-- mostraram nenhuma Edge Function ou secret de backup pré-existentes — ao
-- contrário de BE-M-09, não há objeto equivalente da implementação anterior
-- a reaproveitar aqui (achado documentado em `BLOCKERS.md`, nota de
-- verificação prévia).
--
-- Mecânica (DIR-31: "Edge Function + pg_cron"): `pg_cron` agenda uma chamada
-- diária que dispara `public.trigger_backup_export()`, que por sua vez invoca
-- a Edge Function `backup-export` via `pg_net` (`net.http_post`) — a Edge
-- Function faz o dump lógico das tabelas de produto, criptografa (AES-256-GCM)
-- e envia a um bucket S3-compatível fora do Supabase. Um segundo job
-- (`public.check_backup_health()`) roda a cada 6h e aciona alerta por e-mail
-- se o último sucesso registrado tiver mais de 26h (DIR-32).
--
-- URL da função e segredo compartilhado (`X-Cron-Secret`, autenticação
-- fail-closed — a Edge Function não usa `verify_jwt`, pois não há JWT de
-- usuário em um cron job) vêm do Supabase Vault (`supabase_vault`, já
-- instalado — ver AUDITORIA-BE-M-00.md Seção 11), nunca hardcoded aqui:
-- os valores reais são inseridos uma única vez, fora desta migration
-- versionada, via `select vault.create_secret(<valor>, 'backup_edge_function_url')`
-- e `select vault.create_secret(<valor>, 'backup_cron_secret')` (DIR-30 —
-- segredo nunca commitado no repositório).
--
-- Rollback: supabase/migrations_down/20260903090000_be_m10_backup_export.down.sql

create extension if not exists pg_net;

-- ===================== Log de execução (DIR-32) =====================

create table public.backup_export_log (
  id            uuid primary key default gen_random_uuid(),
  started_at    timestamptz not null,
  finished_at   timestamptz not null,
  status        text not null check (status in ('success', 'failure')),
  object_key    text,
  size_bytes    bigint,
  error_message text,
  created_at    timestamptz not null default now()
);

comment on table public.backup_export_log is
  'BE-M-10 — log de cada execução do export lógico diário de backup (DIR-32, '
  '"execução consultável"). Gravada pela Edge Function backup-export via '
  'service_role; sem policy nenhuma para anon/authenticated (RLS habilitada, '
  'nega tudo por padrão — não é dado de usuário, é metadado operacional).';

alter table public.backup_export_log enable row level security;

create index backup_export_log_status_finished_at_idx
  on public.backup_export_log (status, finished_at desc);

-- ===================== Disparo via pg_net (DIR-31) =====================

create or replace function public.trigger_backup_export()
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
    from vault.decrypted_secrets where name = 'backup_edge_function_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'backup_cron_secret';

  if v_url is null or v_secret is null then
    raise warning 'BE-M-10: backup_edge_function_url/backup_cron_secret ausentes no Vault — job não disparado';
    return;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body    := '{}'::jsonb
  );
end;
$$;

comment on function public.trigger_backup_export() is
  'BE-M-10 — dispara o export lógico diário via pg_net (chamada assíncrona à '
  'Edge Function backup-export). Agendada por pg_cron, cadência diária (ADR-009).';

create or replace function public.check_backup_health()
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
    from vault.decrypted_secrets where name = 'backup_edge_function_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'backup_cron_secret';

  if v_url is null or v_secret is null then
    raise warning 'BE-M-10: backup_edge_function_url/backup_cron_secret ausentes no Vault — healthcheck não disparado';
    return;
  end if;

  perform net.http_post(
    url     := v_url || '?mode=healthcheck',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body    := '{}'::jsonb
  );
end;
$$;

comment on function public.check_backup_health() is
  'BE-M-10 — dispara o healthcheck (DIR-32: alerta se o job não rodar por '
  '>26h) via pg_net. Agendada por pg_cron a cada 6h — mais frequente que a '
  'própria cadência do backup para detectar falha de agendamento a tempo.';

-- ===================== Agendamento (pg_cron) =====================

select cron.schedule(
  'be-m10-daily-backup-export',
  '0 3 * * *', -- diário às 03:00 UTC (DIR-31 — nunca semanal)
  $$select public.trigger_backup_export();$$
);

select cron.schedule(
  'be-m10-backup-health-check',
  '0 */6 * * *', -- a cada 6h (DIR-32 — detecta falha de agendamento bem antes do limiar de 26h)
  $$select public.check_backup_health();$$
);
