-- Rollback manual de 20260909122000_be_f3_08_adr020_drop_photo_comment.sql
-- Restaura o texto de comentário anterior (pré-ADR-020) — só necessário se
-- esta migration for revertida isoladamente sem reverter
-- 20260909120000_be_f3_08_data_retention_purge_jobs.sql também (que dropa a
-- própria função).

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
