/**
 * Leitura tipada das variáveis de ambiente expostas ao bundle do cliente (Vite,
 * prefixo `VITE_*` — ver `.env.example`). Centralizado aqui para nunca espalhar
 * `import.meta.env.VITE_*` cru pelo app e para falhar cedo/de forma legível se uma
 * variável obrigatória estiver ausente, em vez de um erro genérico do supabase-js.
 */
function readEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente ${name} ausente — configure ${name} no .env local (ver .env.example) antes de rodar o app.`,
    );
  }
  return value;
}

export function getSupabaseUrl(): string {
  return readEnv("VITE_SUPABASE_URL");
}

export function getSupabaseAnonKey(): string {
  return readEnv("VITE_SUPABASE_ANON_KEY");
}

/**
 * Chave pública VAPID de Web Push (`DEPLOY.md`: `VITE_VAPID_PUBLIC_KEY`, configurada
 * no painel Vercel por ambiente; par gerado pelo Backend em `BE-F2-09`). **Não lança**
 * se ausente (diferente de `readEnv`) — DIR-14/`NotificationCenter` é sempre o canal
 * primário de aviso, independente de push estar configurado; a UI degrada oferecendo
 * só o histórico in-app, nunca bloqueia o app por falta desta variável opcional.
 */
export function getVapidPublicKey(): string | null {
  return (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? null;
}

/**
 * Gate de exposição em produção do formulário unificado de conta + forma de
 * pagamento (`BE-REF-06`, `ADR-016` Decisão 5, `DIR-39`). Ausente ou qualquer
 * valor diferente da string `"true"` é tratado como `false` — default seguro,
 * a flag nunca liga sozinha por omissão de variável. Só vira `true` em
 * produção depois de `BLOCKERS.md` Bloqueio 013 confirmado `Resolvido` pelo
 * DevSecOps, ato exclusivo de `BE-REF-06` (nenhuma outra tarefa liga a flag).
 * Com `false` (comportamento hoje em produção): formulário de lançamento
 * exige o campo "Conta" explicitamente (pré-`RF-REF-04`). Com `true`:
 * formulário unificado — campo "Conta" some, `account_id` é resolvido
 * server-side a partir de `payment_method_id`.
 */
export function isPaymentMethodUnificationEnabled(): boolean {
  return import.meta.env.VITE_PAYMENT_METHOD_UNIFICATION_ENABLED === "true";
}
