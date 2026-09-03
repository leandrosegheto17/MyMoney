-- Rollback manual de 20260903090000_be_m10_backup_export.sql
-- Não remove a extensão pg_net (objeto de infraestrutura compartilhada, sem
-- dado a perder; removê-la é desnecessário para desfazer esta migration e
-- poderia afetar outro consumidor futuro de pg_net — mesmo princípio de não
-- remover mais do que o estritamente adicionado por esta tarefa).

select cron.unschedule('be-m10-daily-backup-export');
select cron.unschedule('be-m10-backup-health-check');

drop function if exists public.check_backup_health();
drop function if exists public.trigger_backup_export();

drop table if exists public.backup_export_log;
