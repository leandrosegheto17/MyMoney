-- Reverte o bypass temporário de 20260904090000_temp_bypass_email_mfa_gate.sql,
-- restaurando a lógica original de custom_access_token_hook (F1-BE-14/SDD.md
-- §3/RF11): app_email_mfa_verified só é 'true' quando existe um desafio
-- consumido em public.email_mfa_challenges para o mesmo user_id+session_id.
CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_user_id    uuid := (event->>'user_id')::uuid;
  v_session_id uuid;
  v_claims     jsonb;
  v_verified   boolean;
begin
  v_claims := coalesce(event->'claims', '{}'::jsonb);

  begin
    v_session_id := (v_claims->>'session_id')::uuid;
  exception when others then
    v_session_id := null;
  end;

  v_verified := false;

  if v_user_id is not null and v_session_id is not null then
    select exists (
      select 1
      from public.email_mfa_challenges
      where user_id = v_user_id
        and session_id = v_session_id
        and consumed_at is not null
    )
    into v_verified;
  end if;

  if v_verified then
    v_claims := jsonb_set(v_claims, '{app_email_mfa_verified}', to_jsonb('true'::text));
  end if;

  event := jsonb_set(event, '{claims}', v_claims);
  return event;
end;
$$;

COMMENT ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") IS 'F1-BE-14/SDD.md §3/RF11: hook auth.hook.custom_access_token (ver supabase/config.toml). SECURITY DEFINER — roda como dono da função (postgres, com BYPASSRLS neste ambiente), por isso enxerga email_mfa_challenges mesmo com a tabela em RLS deny-all. Chamado pelo GoTrue como supabase_auth_admin a cada emissão/renovação de access token; nunca deve ser chamável pelo client (ver REVOKE abaixo).';
