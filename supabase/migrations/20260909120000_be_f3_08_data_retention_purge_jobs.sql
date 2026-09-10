-- BE-F3-08 — Jobs diários de expurgo de dado transitório (ADR-011,
-- TASK.md Seção 3.3, lote "Retenção & Descarte de Dado / Exclusão de Conta").
--
-- `DIR-33` checado antes de escrever qualquer código novo: `supabase
-- functions list` no projeto linkado mostrou as 8 functions já conhecidas
-- (`auth-email-mfa`/`webauthn-*`/`backup-export`/`invoice-close`/
-- `recurring-generate`/`fixed-bill-generate`/`push-dispatch`) — nenhuma
-- sobreposição com um job de expurgo de dado, sem necessidade de
-- `BLOCKERS.md`.
--
-- ============================================================================
-- ACHADO DE LACUNA REAL DE ESPECIFICAÇÃO (reportado, não decidido sozinho —
-- ver nota de implementação em TASK.md BE-F3-08 e novo Bloqueio em
-- BLOCKERS.md): ADR-011/SDD.md Seção 7 definem retenção de "foto de recibo
-- (Storage) vinculada a candidato descartado/abandonado" (30 dias) e
-- "vinculada a lançamento confirmado" (90 dias após confirmed_at). Mas, na
-- auditoria desta sessão, NENHUM mecanismo de persistência de foto de recibo
-- existe em nenhum lugar do código: `receipt-ocr` (BE-F3-01) foi
-- deliberadamente implementada sem persistir a imagem ("não persiste nada em
-- nenhum caminho", nota de status de BE-F3-01), `candidate_transaction`
-- (BE-F3-00) não tem coluna alguma de path/URL de Storage, e a entidade
-- `Attachment` (SDD.md Seção 5.2, "achado adicional desta auditoria") está
-- explicitamente marcada como "FK a adicionar quando a tabela existir" — a
-- tabela nunca foi criada por nenhuma tarefa do TASK.md. Não existe hoje
-- nenhum bucket de Storage para foto de recibo (diferente do bucket
-- `exports`, criado por BE-F3-07) nem qualquer coluna que associe uma
-- imagem a um `candidate_transaction`/`transactions`.
--
-- Desenhar essa persistência agora (tabela nova + bucket novo + reabrir
-- BE-F3-01/02/03 e o fluxo de confirmação do Frontend para de fato enviar e
-- gravar a foto) é uma decisão de arquitetura/modelo de dados nova, de escopo
-- muito maior que "job diário de expurgo" (a própria estimativa de 2.5 dias
-- desta tarefa não contempla desenhar um pipeline de upload/persistência de
-- imagem do zero) — não é um detalhe de implementação que o Backend possa
-- resolver e documentar sozinho (GUARDRAILS.md, limite de autoridade do
-- Executor). Por isso esta migration implementa com confiança total os DOIS
-- jobs cuja fonte de dado já existe de verdade:
--
--   (1) expurgo de `CandidateTransaction` descartado/abandonado (30 dias) —
--       a LINHA em si, sem a parte "e a foto associada" do critério de
--       aceite, que fica bloqueada pela lacuna acima;
--   (2) expurgo de export CSV/PDF (>24h) do bucket `exports` (BE-F3-07).
--
-- O terceiro job ("foto de recibo de lançamento confirmado, 90 dias após
-- confirmed_at") fica **Bloqueado** por completo (nenhuma foto existe para
-- expurgar) — registrado em BLOCKERS.md, não implementado como um job vazio
-- disfarçado de "concluído".
--
-- Mesmo padrão de agendamento já usado por BE-M-10 (`pg_cron` + `pg_net` +
-- Edge Function com segredo compartilhado do Vault, DIR-31), e mesmo padrão
-- de log/alerta consultável em caso de falha (DIR-32, tabela dedicada +
-- healthcheck de staleness).
--
-- 100% aditiva (DIR-03/G-03): CREATE TABLE, CREATE FUNCTION x4, cron.schedule
-- x2. Nenhuma linha real de dado de usuário em `public` é alterada por esta
-- migration; `purge_expired_candidate_transactions()`/o expurgo de exports só
-- removem dado cujo próprio propósito (ADR-011) é ser removido após o prazo.
-- Rollback: supabase/migrations_down/20260909120000_be_f3_08_data_retention_purge_jobs.down.sql

create extension if not exists pg_net;

-- ===================== Log de execução (DIR-32) =====================

create table public.data_retention_purge_log (
  id            uuid primary key default gen_random_uuid(),
  job_name      text not null,
  started_at    timestamptz not null,
  finished_at   timestamptz not null,
  status        text not null check (status in ('success', 'failure')),
  detail        jsonb not null default '{}'::jsonb,
  error_message text,
  created_at    timestamptz not null default now()
);

comment on table public.data_retention_purge_log is
  'BE-F3-08 (ADR-011) — log de cada execução do job diário de expurgo de '
  'dado transitório (DIR-32, "execução consultável"). "job_name" identifica '
  'qual sub-job gerou a linha (candidate_transaction_purge, export_purge). '
  'Gravada via service_role; sem policy nenhuma para anon/authenticated '
  '(RLS habilitada, nega tudo por padrão — mesmo padrão de '
  'backup_export_log/BE-M-10, metadado operacional, não dado de usuário).';

alter table public.data_retention_purge_log enable row level security;

create index data_retention_purge_log_job_status_finished_idx
  on public.data_retention_purge_log (job_name, status, finished_at desc);

-- ===================== Job 1: CandidateTransaction expirado =====================
--
-- ADR-011 (tabela-resumo, linha "CandidateTransaction descartado ou
-- abandonado"): 30 dias a partir de status=discarded, OU 30 dias a partir da
-- criação do ImportBatch se permanecer pending sem confirmação/descarte.
-- Decisão de interpretação pequena, documentada aqui (candidato pending SEM
-- import_batch_id — captura avulsa de voz/foto, BE-F3-00 — não tem
-- "ImportBatch" do qual contar; usa o próprio created_at do candidato como
-- equivalente, mesmo espírito literal da regra: "tempo desde que o rascunho
-- passou a existir sem ação do usuário").

create function public.purge_expired_candidate_transactions(p_retention_days int default 30)
returns int
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_deleted int;
begin
  with expired as (
    select ct.id
    from public.candidate_transaction ct
    left join public.import_batch ib on ib.id = ct.import_batch_id
    where
      (ct.status = 'discarded' and ct.discarded_at < now() - (p_retention_days || ' days')::interval)
      or (
        ct.status = 'pending'
        and coalesce(ib.created_at, ct.created_at) < now() - (p_retention_days || ' days')::interval
      )
  )
  delete from public.candidate_transaction ct
  using expired
  where ct.id = expired.id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function public.purge_expired_candidate_transactions(int) is
  'ADR-011 (BE-F3-08) — remove fisicamente CandidateTransaction descartado '
  'há mais de p_retention_days (default 30) OU pending sem ação há mais de '
  'p_retention_days desde a criação do ImportBatch associado (ou desde o '
  'próprio created_at, para candidato avulso de voz/foto sem lote — decisão '
  'de interpretação pequena, ver cabeçalho da migration). SECURITY DEFINER: '
  'roda cross-usuário por natureza (job administrativo, não uma ação de um '
  'usuário específico), mesmo padrão de G-19 para checagem/ação '
  'cross-usuário. NÃO remove nenhuma foto associada no Storage — nenhum '
  'mecanismo de persistência de foto de recibo existe hoje no código (ver '
  'achado de lacuna no cabeçalho da migration, BLOCKERS.md).';

-- ===================== Job 2: Exports expirados (bucket `exports`) =====================
--
-- ADR-011 (tabela-resumo, linha "Exports gerados sob demanda"): até 24h após
-- a geração. `exports` (BE-F3-07) não tem tabela de metadado própria — o
-- `created_at` nativo de `storage.objects` já é suficiente (decisão já
-- documentada em BE-F3-07). Função de leitura pura (retorna os paths a
-- apagar); a remoção física em si (bytes + linha de storage.objects) é feita
-- pela Edge Function via Storage API (`supabase.storage.from('exports').remove(...)`),
-- nunca por DELETE direto em storage.objects — DELETE via SQL só removeria a
-- linha de metadado, sem garantia de remover o objeto físico no backend de
-- armazenamento (mesmo princípio de nunca fingir sucesso já usado em
-- BE-F3-01/02/03/07).

create function public.list_expired_export_objects(p_before timestamptz)
returns table (name text)
language sql
stable
security definer
set search_path to 'public', 'storage', 'pg_temp'
as $$
  select o.name
  from storage.objects o
  where o.bucket_id = 'exports'
    and o.created_at < p_before;
$$;

comment on function public.list_expired_export_objects(timestamptz) is
  'ADR-011 (BE-F3-08) — paths de objetos do bucket exports (BE-F3-07) criados '
  'antes de p_before, prontos para a Edge Function data-retention-purge '
  'remover via Storage API. Leitura pura, não apaga nada (I/O mínimo aqui, '
  'mesmo padrão de get_report_export_rows/BE-F3-07).';

-- ===================== Disparo via pg_net (DIR-31) =====================

create or replace function public.trigger_data_retention_purge()
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
    from vault.decrypted_secrets where name = 'data_retention_edge_function_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'data_retention_cron_secret';

  if v_url is null or v_secret is null then
    raise warning 'BE-F3-08: data_retention_edge_function_url/data_retention_cron_secret ausentes no Vault — job não disparado';
    return;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body    := '{}'::jsonb
  );
end;
$$;

comment on function public.trigger_data_retention_purge() is
  'BE-F3-08 (ADR-011) — dispara o expurgo diário de dado transitório via '
  'pg_net (chamada assíncrona à Edge Function data-retention-purge). '
  'Agendada por pg_cron, cadência diária.';

create or replace function public.check_data_retention_health()
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
    from vault.decrypted_secrets where name = 'data_retention_edge_function_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'data_retention_cron_secret';

  if v_url is null or v_secret is null then
    raise warning 'BE-F3-08: data_retention_edge_function_url/data_retention_cron_secret ausentes no Vault — healthcheck não disparado';
    return;
  end if;

  perform net.http_post(
    url     := v_url || '?mode=healthcheck',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body    := '{}'::jsonb
  );
end;
$$;

comment on function public.check_data_retention_health() is
  'BE-F3-08 (ADR-011) — dispara o healthcheck (DIR-32: alerta se o job não '
  'rodar por >26h) via pg_net. Agendada por pg_cron a cada 6h, mesmo padrão '
  'de check_backup_health/BE-M-10.';

-- ===================== Agendamento (pg_cron) =====================
--
-- Horário deliberadamente distinto de be-m10-daily-backup-export (03:00 UTC)
-- para não competir por I/O no mesmo minuto.

select cron.schedule(
  'be-f3-08-daily-data-retention-purge',
  '30 3 * * *', -- diário às 03:30 UTC
  $$select public.trigger_data_retention_purge();$$
);

select cron.schedule(
  'be-f3-08-data-retention-health-check',
  '15 */6 * * *', -- a cada 6h (offset de 15min do healthcheck de backup)
  $$select public.check_data_retention_health();$$
);
