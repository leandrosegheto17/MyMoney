-- BE-F3-08 — Endurecimento pontual de privilégio (achado próprio desta
-- sessão, não herdado do padrão sistêmico já aceito): `SECURITY-REVIEW.md`
-- já registra, como débito sistêmico aceito (não deste lote), que funções
-- `SECURITY DEFINER` de cron do tipo `trigger_backup_export`/
-- `check_backup_health`/`trigger_recurring_generate` não têm `REVOKE EXECUTE`
-- explícito — mas o próprio texto do achado distingue esse caso do de uma
-- função que "retorna dado de outro usuário ao chamador" (linha
-- "retornam só integer/void... **nenhum vazamento de dado cross-tenant ao
-- chamador**").
--
-- `public.list_expired_export_objects(timestamptz)` (desta mesma tarefa,
-- `20260909120000_be_f3_08_data_retention_purge_jobs.sql`) cai exatamente
-- nesse segundo caso: `RETURNS TABLE(name text)` devolve paths que incluem o
-- `user_id` de QUALQUER usuário com export pendente — se deixada com o grant
-- default de `PUBLIC`/`anon`/`authenticated` herdado do baseline (mesmo
-- achado sistêmico já documentado), qualquer chamador sem sessão
-- (`POST /rest/v1/rpc/list_expired_export_objects`, papel `anon`) conseguiria
-- enumerar pastas/nomes de arquivo de outros usuários — um vazamento de dado
-- real, não só "acionar o job fora de hora" (que é o pior caso já aceito
-- para os cron triggers void). `public.purge_expired_candidate_transactions`
-- não vaza dado (retorna só um contador), mas ainda assim é travada aqui pelo
-- mesmo princípio de menor privilégio — nenhuma razão para deixá-la invocável
-- por um chamador sem sessão.
--
-- Fora de escopo desta migration (não é decisão desta tarefa): endurecer
-- retroativamente as funções já existentes do "achado sistêmico" — isso já
-- está rastreado como débito próprio (ver referência a `SEC-DEBT-006` em
-- `SECURITY-REVIEW.md`). Aqui só a superfície NOVA introduzida por BE-F3-08
-- nasce já fechada, sem esperar uma auditoria futura corrigir depois.
--
-- Rollback: supabase/migrations_down/20260909121000_be_f3_08_revoke_execute_purge_functions.down.sql

revoke execute on function public.list_expired_export_objects(timestamptz) from public, anon, authenticated;
grant execute on function public.list_expired_export_objects(timestamptz) to service_role;

revoke execute on function public.purge_expired_candidate_transactions(int) from public, anon, authenticated;
grant execute on function public.purge_expired_candidate_transactions(int) to service_role;
