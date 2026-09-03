// BE-M-09 — headers CORS compartilhados por todas as Edge Functions de WebAuthn.
// DIR-28: TLS obrigatório (garantido pela infra gerenciada); aqui só CORS de
// aplicação. Origem restrita via env var (nunca "*") — mesma disciplina de
// DIR-30 (nenhum segredo/config sensível hardcoded).
export function corsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = Deno.env.get("WEBAUTHN_ORIGIN") ?? "";
  const allowOrigin = origin && origin === allowedOrigin ? origin : allowedOrigin;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
