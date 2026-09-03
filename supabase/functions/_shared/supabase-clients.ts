// BE-M-09 — fábricas de cliente Supabase para as Edge Functions de WebAuthn.
// DIR-30: toda chave sensível (service_role) vem de env var server-side, nunca
// hardcoded nem exposta ao bundle do cliente.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

// Cliente com o JWT do usuário autenticado (respeita RLS) — usado para
// identificar quem está chamando (auth.getUser()), nunca para operações que
// exigem bypass de RLS (essas usam o client de service role abaixo).
export function userClient(authHeader: string | null): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(supabaseUrl, anonKey, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
    auth: { persistSession: false },
  });
}

// Cliente de service_role — usado só para gerenciar `webauthn_challenges`
// (tabela sem policy nenhuma para anon/authenticated, DIR-24/DIR-30 mesmo
// princípio de "nunca no cliente") e para o INSERT final em
// `webauthn_credentials` em nome do usuário já identificado via userClient().
export function serviceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
