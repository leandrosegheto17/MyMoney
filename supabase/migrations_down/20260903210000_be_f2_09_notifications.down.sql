-- Rollback manual de 20260903210000_be_f2_09_notifications.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>
-- ATENÇÃO: reverte a infraestrutura compartilhada de notificação (RF-F2-09) —
-- BE-F2-07 (check_fixed_bill_due_alerts) depende de notify_user() e deixaria
-- de funcionar. Reverta BE-F2-07 antes, se já aplicado. Também recomendado:
-- `select cron.unschedule('be-f2-09-budget-alerts');` e remover a Edge
-- Function `push-dispatch` — não incluído aqui por operar fora do escopo de
-- uma migration SQL.

select cron.unschedule('be-f2-09-budget-alerts');

drop function if exists public.check_budget_alerts();
drop function if exists public.notify_user(uuid, public.notification_type, text, text, uuid);

drop policy if exists notifications_update_own on public.notifications;
drop policy if exists notifications_select_own on public.notifications;
drop table if exists public.notifications;
drop type if exists public.notification_type;

drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
drop table if exists public.push_subscriptions;
