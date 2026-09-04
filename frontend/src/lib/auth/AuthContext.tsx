import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getCurrentSession, isEmailMfaVerified, onAuthStateChange, signOut as supabaseSignOut } from "./session";
import { hasPinConfigured } from "./pin";

/**
 * Máquina de estado de autenticação/desbloqueio (UX-FL-10) — deriva o "estágio" atual
 * a partir de 3 fontes independentes, nunca um único booleano:
 * 1. Sessão Supabase Auth (1º fator, e-mail/senha ou link mágico);
 * 2. Claim `app_email_mfa_verified` do JWT (2º fator, `auth-email-mfa`, `custom_access_token_hook`);
 * 3. PIN local configurado neste dispositivo (`pin.ts`, IndexedDB) + `unlocked` (estado
 *    em memória, nunca persistido — resetado a cada carregamento de página, DIR-16:
 *    "toda abertura/retomada do app" exige novo desbloqueio).
 *
 * DIR-19/G-07: `unlocked` (estágio "unlocked") nunca substitui `session` — as duas
 * são independentes; uma chamada de API sem `session` válida falha por RLS
 * independentemente do valor de `unlocked`.
 */
export type AuthStage = "loading" | "signed-out" | "needs-mfa" | "needs-pin-setup" | "locked" | "unlocked";

/**
 * BYPASS TEMPORÁRIO (2026-09-04, pedido explícito do stakeholder, ver
 * `BLOCKERS.md` Bloqueio 018): `auth-email-mfa` está com uma falha de
 * conectividade não resolvida, bloqueando 100% dos logins. Login segue com
 * 1 fator só (e-mail/senha) até o 2º fator ser corrigido. O backend
 * (`custom_access_token_hook`, migration `20260904090000`) já emite
 * `app_email_mfa_verified=true` sempre, então esta flag só evita mostrar a
 * tela de MFA — reverter junto com a migration down correspondente.
 */
const SKIP_EMAIL_MFA = true;

interface AuthContextValue {
  stage: AuthStage;
  session: Session | null;
  /** Reavalia sessão/MFA/PIN configurado — chamar após login, verificação de MFA, ou setup de PIN. */
  refresh: () => Promise<void>;
  /** Chamado após PIN/WebAuthn confirmados com sucesso (S-AUTH-03/04). */
  unlock: () => void;
  /** Rebloqueia manualmente (defensivo — não há gatilho automático de timeout especificado no UX-SPEC.md para o MVP). */
  lock: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [pinConfigured, setPinConfigured] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [currentSession, pinExists] = await Promise.all([getCurrentSession(), hasPinConfigured()]);
    setSession(currentSession);
    setPinConfigured(pinExists);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    return onAuthStateChange((nextSession) => {
      setSession(nextSession);
      setLoading(false);
      if (!nextSession) setUnlocked(false);
    });
  }, [refresh]);

  const stage: AuthStage = loading
    ? "loading"
    : !session
      ? "signed-out"
      : !SKIP_EMAIL_MFA && !isEmailMfaVerified(session)
        ? "needs-mfa"
        : !pinConfigured
          ? "needs-pin-setup"
          : !unlocked
            ? "locked"
            : "unlocked";

  const value: AuthContextValue = {
    stage,
    session,
    refresh,
    unlock: () => setUnlocked(true),
    lock: () => setUnlocked(false),
    signOut: async () => {
      await supabaseSignOut();
      setUnlocked(false);
      await refresh();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um <AuthProvider>");
  }
  return context;
}
