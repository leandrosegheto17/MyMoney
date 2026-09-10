-- BE-F3-08 — Ajuste de comentário pós-ADR-020 (Bloqueio 024, Resolvido).
--
-- `ADR-020` formalizou (decisão definitiva do stakeholder) que foto de
-- recibo NUNCA será persistida — as 2 linhas de `ADR-011` sobre retenção de
-- foto (90 dias/lançamento confirmado; 30 dias/candidato descartado) ficam
-- sem objeto. `public.purge_expired_candidate_transactions(int)` (migration
-- `20260909120000_be_f3_08_data_retention_purge_jobs.sql`) tinha, no seu
-- `COMMENT ON FUNCTION`, a frase "NÃO remove nenhuma foto associada no
-- Storage — nenhum mecanismo de persistência de foto de recibo existe hoje
-- no código" — escrita quando a lacuna ainda estava aberta. Agora que a
-- decisão é definitiva (nunca haverá foto para remover, não uma lacuna
-- temporária), essa frase fica desatualizada; esta migration só reemite o
-- comentário, sem tocar em nenhuma linha de dado nem na lógica da função.
--
-- 100% aditiva (DIR-03/G-03): `COMMENT ON FUNCTION` é idempotente e não
-- altera schema/dado — só metadado descritivo.
-- Rollback: supabase/migrations_down/20260909122000_be_f3_08_adr020_drop_photo_comment.down.sql

comment on function public.purge_expired_candidate_transactions(int) is
  'ADR-011 (BE-F3-08) — remove fisicamente CandidateTransaction descartado '
  'há mais de p_retention_days (default 30) OU pending sem ação há mais de '
  'p_retention_days desde a criação do ImportBatch associado (ou desde o '
  'próprio created_at, para candidato avulso de voz/foto sem lote — decisão '
  'de interpretação pequena, ver cabeçalho da migration '
  '20260909120000_be_f3_08_data_retention_purge_jobs.sql). SECURITY '
  'DEFINER: roda cross-usuário por natureza (job administrativo, não uma '
  'ação de um usuário específico), mesmo padrão de G-19 para checagem/ação '
  'cross-usuário. Não trata foto de recibo: ADR-020 (Bloqueio 024, '
  'Resolvido) formalizou que foto de recibo nunca é persistida — as linhas '
  'de retenção de foto de ADR-011 ficam sem objeto por decisão de produto, '
  'não por lacuna de implementação.';
