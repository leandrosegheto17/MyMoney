-- Rollback manual de 20260909120000_be_f3_08_data_retention_purge_jobs.sql
-- Não remove a extensão pg_net (objeto de infraestrutura compartilhada, já
-- usada por BE-M-10; removê-la afetaria outro consumidor).

select cron.unschedule('be-f3-08-daily-data-retention-purge');
select cron.unschedule('be-f3-08-data-retention-health-check');

drop function if exists public.check_data_retention_health();
drop function if exists public.trigger_data_retention_purge();
drop function if exists public.list_expired_export_objects(timestamptz);
drop function if exists public.purge_expired_candidate_transactions(int);

drop table if exists public.data_retention_purge_log;
