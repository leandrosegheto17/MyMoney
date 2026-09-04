-- BYPASS TEMPORÁRIO — 2026-09-04, pedido explícito do stakeholder.
--
-- `auth-email-mfa` (Edge Function) está com uma falha de conectividade do
-- client (`supabase.functions.invoke` falhando com "Failed to send a
-- request to the Edge Function" — investigação em andamento, ver
-- BLOCKERS.md Bloqueio 018) que está bloqueando 100% dos logins, já que
-- RF-MVP-08 exige o 2º fator antes de liberar qualquer dado financeiro. O
-- stakeholder decidiu destravar o uso do app com 1 fator só (e-mail/senha)
-- enquanto o problema do 2º fator não é resolvido, em vez de deixar o app
-- inutilizável.
--
-- `custom_access_token_hook` passa a emitir `app_email_mfa_verified=true`
-- sempre, sem checar `public.email_mfa_challenges` — isso libera as 4+
-- tabelas com gate de MFA (accounts/categories/payment_methods/
-- transactions e as demais que copiaram o mesmo padrão em Fase 2) sem
-- exigir o código de e-mail verificado.
--
-- REVERTER assim que `auth-email-mfa` estiver funcionando de novo:
-- supabase/migrations_down/20260904090000_temp_bypass_email_mfa_gate.down.sql
-- restaura a checagem real de `email_mfa_challenges.consumed_at`.
CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_claims jsonb;
begin
  v_claims := coalesce(event->'claims', '{}'::jsonb);
  v_claims := jsonb_set(v_claims, '{app_email_mfa_verified}', to_jsonb('true'::text));
  event := jsonb_set(event, '{claims}', v_claims);
  return event;
end;
$$;

COMMENT ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") IS 'BYPASS TEMPORÁRIO (2026-09-04, BLOCKERS.md Bloqueio 018): sempre emite app_email_mfa_verified=true, sem checar email_mfa_challenges. Reverter via supabase/migrations_down/20260904090000_temp_bypass_email_mfa_gate.down.sql assim que auth-email-mfa voltar a funcionar. Lógica original: F1-BE-14/SDD.md §3/RF11.';
