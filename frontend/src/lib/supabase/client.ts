import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "../env";

/**
 * Cliente Supabase único do app — `API-CONTRACT.yaml` (v0.6.0): "não há servidor de
 * aplicação dedicado (DIR-07/G-14)... a grande maioria dos endpoints é a API REST
 * auto-gerada pelo PostgREST". Este client cobre Auth (sessão/JWT), PostgREST
 * (`.from(...)`/`.rpc(...)`) e invocação de Edge Functions (`.functions.invoke(...)`)
 * — os 3 servidores listados no contrato.
 *
 * `persistSession`/`autoRefreshToken`: a sessão sobrevive a reload de página (o
 * desbloqueio local, DIR-16/17, é uma camada adicional por cima desta sessão, nunca
 * um substituto dela — DIR-19/G-07).
 */
let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

/** Só para teste: força a recriação do client singleton (ex.: trocar env mockado entre casos). */
export function __resetSupabaseClientForTests(): void {
  client = null;
}
