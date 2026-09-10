-- Rollback manual de 20260909121000_be_f3_08_revoke_execute_purge_functions.sql
-- Restaura o grant default herdado do baseline (PUBLIC) — só necessário se a
-- migration acima for revertida isoladamente sem reverter
-- 20260909120000_be_f3_08_data_retention_purge_jobs.sql também (que dropa as
-- próprias funções).

grant execute on function public.list_expired_export_objects(timestamptz) to public;
grant execute on function public.purge_expired_candidate_transactions(int) to public;
