-- BE-F2-09 — Infraestrutura de notificações unificada (RF-F2-09 AC1-2):
-- tabela `notifications` (SDD.md Seção 5.2, entidade ausente nº 9) +
-- mecanismo único de disparo (Web Push VAPID) centralizando orçamento
-- (RF-MVP-07) e conta fixa (RF-F2-07), sem lógica de disparo duplicada.
--
-- Feita ANTES de BE-F2-07 na ordem real de execução (a ordem impressa no
-- TASK.md lista BE-F2-07 antes de BE-F2-09, mas a própria tabela de
-- dependências do PRD-TECNICO.md — "RF-F2-07 (Aviso de conta fixa) depende
-- de RF-F2-06, RF-F2-09" — exige o inverso: aviso de conta fixa PRECISA da
-- infraestrutura compartilhada de notificação já existir, senão BE-F2-07
-- reimplementaria disparo por conta própria, violando o próprio AC1 desta
-- tarefa ("sem duplicar lógica de disparo"). Inversão de ordem documentada
-- aqui, não uma divergência silenciosa do TASK.md.
--
-- Arquitetura (DIR-06, "um único ponto de código dispara push para os 2
-- gatilhos"): `notify_user()` é essa função única — persiste a notificação
-- (histórico consultável no app, AC2, independente de push) e dispara a
-- Edge Function `push-dispatch` via pg_net (mesmo padrão de
-- trigger_backup_export/trigger_invoice_close/trigger_recurring_generate/
-- trigger_fixed_bill_generate). Orçamento (check_budget_alerts, nesta
-- migration) e conta fixa (check_fixed_bill_due_alerts, BE-F2-07) chamam
-- `notify_user()` — nenhum dos dois fala com push_subscriptions/Web Push
-- diretamente, só via essa função.
--
-- push_subscriptions não está no modelo lógico do SDD.md (que só lista
-- "tipo, mensagem, entidade relacionada, lida_em, criada_em" pra
-- Notification) — decisão física do Backend: Web Push exige guardar o
-- endpoint/chaves de cada dispositivo inscrito, entidade companheira
-- necessária, não uma "notificação" em si.
--
-- 100% aditiva (DIR-03): CREATE TYPE, CREATE TABLE, CREATE FUNCTION.
-- Nenhuma linha real de public é alterada.
-- Rollback: supabase/migrations_down/20260903210000_be_f2_09_notifications.down.sql

-- =============================================================================
-- 1. Inscrições de Web Push (1 linha por dispositivo/navegador inscrito).
-- =============================================================================

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth_key   text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

comment on table public.push_subscriptions is
  'BE-F2-09 — inscrição de Web Push por dispositivo/navegador (endpoint + '
  'chaves VAPID do subscription, RFC8291). Não modelada no SDD.md Seção 5.2 '
  '(decisão física do Backend — companheira de Notification, não é ela '
  'mesma). Sem gate de MFA (DIR-27 não exige, não é dado financeiro — '
  'inscrever/desinscrever push é ação de baixo risco).';

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated
  using (auth.uid() = user_id);

create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 2. Notification (RF-F2-09, SDD.md Seção 5.2) — histórico consultável no
--    app (AC2), independente de o push ter sido entregue (DIR-14). Só
--    SELECT/UPDATE (marcar como lida) para authenticated — INSERT é
--    exclusivo de notify_user() (SECURITY DEFINER); client nunca cria
--    notificação diretamente.
-- =============================================================================

create type public.notification_type as enum ('budget_alert', 'fixed_bill_due');

create table public.notifications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  type                public.notification_type not null,
  message             text not null,
  related_entity_type text,
  related_entity_id   uuid,
  read_at             timestamptz,
  created_at          timestamptz not null default now()
);

comment on table public.notifications is
  'RF-F2-09 — histórico de notificação (tipo, mensagem, entidade relacionada, '
  'lida_em, criada_em). Só escrita via notify_user() (SECURITY DEFINER); '
  'client só lê e marca como lida (read_at) — nunca cria notificação '
  'diretamente (DIR-14: NotificationCenter é sempre o canal primário, '
  'independente de push entregue).';

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (auth.uid() = user_id);

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================================================
-- 3. Ponto único de disparo (DIR-06) — persiste + aciona push via pg_net.
--    SECURITY DEFINER: chamada por jobs globais (check_budget_alerts nesta
--    migration, check_fixed_bill_due_alerts em BE-F2-07), precisa gravar em
--    nome de QUALQUER usuário, não só o do chamador.
-- =============================================================================

create function public.notify_user(
  p_user_id             uuid,
  p_type                public.notification_type,
  p_message             text,
  p_related_entity_type text default null,
  p_related_entity_id   uuid default null
) returns uuid
language plpgsql
security definer
set search_path to 'public', 'net', 'vault', 'pg_temp'
as $$
declare
  v_notification_id uuid;
  v_url              text;
  v_secret           text;
begin
  insert into public.notifications (user_id, type, message, related_entity_type, related_entity_id)
  values (p_user_id, p_type, p_message, p_related_entity_type, p_related_entity_id)
  returning id into v_notification_id;

  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'push_dispatch_edge_function_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'push_dispatch_cron_secret';

  if v_url is null or v_secret is null then
    raise warning 'notify_user: push_dispatch_edge_function_url/push_dispatch_cron_secret ausentes no Vault — notificação % persistida (histórico OK, AC2), push não disparado', v_notification_id;
    return v_notification_id;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body    := jsonb_build_object('notification_id', v_notification_id)
  );

  return v_notification_id;
end;
$$;

comment on function public.notify_user(uuid, public.notification_type, text, text, uuid) is
  'RF-F2-09 AC1 — único ponto de código que persiste notificação (AC2, '
  'histórico independente de push) e dispara Web Push (Edge Function '
  'push-dispatch via pg_net). Chamada por check_budget_alerts (RF-MVP-07) e '
  'check_fixed_bill_due_alerts (RF-F2-07, BE-F2-07) — nenhum dos 2 fala com '
  'push_subscriptions diretamente.';

-- =============================================================================
-- 4. Verificação diária de orçamento próximo do teto (RF-MVP-07/RN-04) —
--    replica o cálculo de get_budget_status (BE-M-08), mas SEM o filtro
--    `= auth.uid()` daquela função (que é STABLE/invoker, correta para
--    leitura do próprio usuário — auth.uid() seria NULL num job SECURITY
--    DEFINER sem sessão, zerando o resultado). Não é duplicação de "lógica
--    de disparo" (DIR-06/AC1) — o disparo em si continua 100% em
--    notify_user(); só o critério de SELEÇÃO difere entre leitura
--    RLS-escopada e varredura global, mesmo padrão já usado em
--    generate_upcoming_invoices/generate_recurring_transactions/etc.
--    Dedup: 1 notificação por (budget, nível de alerta) por mês —
--    "warning" e "exceeded" são o mesmo `type=budget_alert`,
--    `related_entity_type` distinto ('budget_warning'/'budget_exceeded')
--    permite escalar de aviso pra estouro sem alertar 2x no mesmo nível.
-- =============================================================================

create function public.check_budget_alerts()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_row          record;
  v_alert_level  text;
  v_entity_type  text;
  v_month_start  date := date_trunc('month', current_date)::date;
  v_month_end    date := (date_trunc('month', current_date) + interval '1 month')::date;
  v_count        integer := 0;
begin
  for v_row in
    select
      bu.id as budget_id,
      bu.user_id,
      c.name as category_name,
      bu.limit_cents,
      bu.alert_threshold_pct,
      coalesce(sum(t.amount_cents) filter (
        where t.kind = 'expense' and t.transaction_date >= v_month_start and t.transaction_date < v_month_end
      ), 0)::bigint as spent_cents
    from public.budget bu
    join public.categories c on c.id = bu.category_id
    left join public.transactions t on t.category_id = bu.category_id and t.user_id = bu.user_id
    where bu.month = v_month_start
    group by bu.id, bu.user_id, c.name, bu.limit_cents, bu.alert_threshold_pct
  loop
    begin
      v_alert_level := case
        when v_row.spent_cents > v_row.limit_cents then 'exceeded'
        when v_row.spent_cents >= (v_row.limit_cents * v_row.alert_threshold_pct / 100.0) then 'warning'
        else 'none'
      end;

      continue when v_alert_level = 'none';

      v_entity_type := 'budget_' || v_alert_level;

      if exists (
        select 1 from public.notifications
        where type = 'budget_alert'
          and related_entity_type = v_entity_type
          and related_entity_id = v_row.budget_id
          and created_at >= v_month_start
      ) then
        continue;
      end if;

      perform public.notify_user(
        v_row.user_id,
        'budget_alert',
        case v_alert_level
          when 'exceeded' then format('Orçamento de %s estourou o teto (%s%% gasto)', v_row.category_name, round((v_row.spent_cents::numeric / nullif(v_row.limit_cents, 0)::numeric) * 100))
          else format('Orçamento de %s está próximo do teto (%s%% gasto)', v_row.category_name, round((v_row.spent_cents::numeric / nullif(v_row.limit_cents, 0)::numeric) * 100))
        end,
        v_entity_type,
        v_row.budget_id
      );
      v_count := v_count + 1;
    exception when others then
      raise warning 'check_budget_alerts: falha ao notificar budget % (%): %', v_row.budget_id, v_row.category_name, sqlerrm;
    end;
  end loop;

  return v_count;
end;
$$;

comment on function public.check_budget_alerts() is
  'RF-MVP-07/RN-04 (BE-F2-09) — varre todo orçamento do mês corrente de '
  'todos os usuários, dispara notify_user() quando cruza 80% (warning) ou '
  '100%+ (exceeded) do teto, 1x por (budget, nível) por mês. SECURITY '
  'DEFINER: cobre orçamento de todos os usuários (auth.uid() seria NULL '
  'aqui). Retorna nº de notificações disparadas nesta execução.';

select cron.schedule(
  'be-f2-09-budget-alerts',
  '0 7 * * *', -- diário às 07:00 UTC (backup 03:00, invoice-close 04:00, recurring-generate 05:00, fixed-bill-generate 06:00 — sem concorrência)
  $$select public.check_budget_alerts();$$
);

-- =============================================================================
-- Nota operacional (não-SQL): a Edge Function push-dispatch (chamada
-- diretamente por notify_user() via pg_net — não é um job pg_cron, dispara
-- sob demanda a cada notificação criada, por isso não tem cron.schedule
-- próprio) é deployada via `supabase functions deploy push-dispatch`; suas
-- chaves VAPID/segredo de cron são geradas nesta sessão e configuradas fora
-- desta migration versionada (`supabase secrets set` + `vault.create_secret`,
-- DIR-30 — nunca commitadas no repositório) — ver
-- supabase/functions/push-dispatch/.
-- =============================================================================
