-- ADR-014 (2026-09-04): remoção definitiva do 2º fator por e-mail — decisão do
-- stakeholder, não mais um bypass temporário (era `BLOCKERS.md` Bloqueio 018 +
-- migration 20260904090000). Nenhuma mudança de comportamento nesta migration —
-- `custom_access_token_hook` já emite `app_email_mfa_verified=true` sempre desde
-- 20260904090000; aqui só corrige o COMMENT para refletir que isso é definitivo.
COMMENT ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") IS 'ADR-014: 2º fator por e-mail removido definitivamente da arquitetura (decisão do stakeholder, não bypass temporário). Emite app_email_mfa_verified=true sempre, por design. email_mfa_challenges e a Edge Function auth-email-mfa ficam órfãs (sem uso ativo). Lógica original (checagem real via email_mfa_challenges), caso algum dia seja necessária de novo: supabase/migrations_down/20260904090000_temp_bypass_email_mfa_gate.down.sql — exigiria um novo ADR para ser reativada.';
