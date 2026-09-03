import { useEffect, useRef, useState } from "react";
import { PinPad } from "../../components/domain/PinPad";
import { getLockoutStatus, recordFailedAttempt, recordSuccessfulUnlock } from "../../lib/auth/lockout";
import type { LockoutStatus } from "../../lib/auth/lockout";
import { verifyPin } from "../../lib/auth/pin";
import { authenticateWithWebAuthn, isNoCredentialsError, isWebAuthnAvailable } from "../../lib/auth/webauthn";
import { useAuth } from "../../lib/auth/AuthContext";

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * S-AUTH-03 (Desbloqueio) + S-AUTH-05 (Bloqueio temporário) — UX-SPEC.md Seção 2.2:
 * "mesma tela do S-AUTH-03, PIN pad desabilitado, mensagem 'Muitas tentativas...' com
 * contagem regressiva". Implementadas como um único componente porque são,
 * literalmente, o mesmo componente lógico com um sub-estado diferente (wireframe da
 * Seção 2.2 é o mesmo para as duas). Desbloqueio 100% local/offline (DIR-16, ADR-010).
 *
 * Pequeno desvio de detalhe (documentado, não escalado — não muda o requisito
 * atendido): o wireframe da Seção 2.2 mostra só um link "Usar PIN em vez disso" sob o
 * prompt biométrico, exigindo um toque extra para revelar o teclado. Esta implementação
 * mantém o `PinPad` diretamente visível/utilizável o tempo todo (o requisito real —
 * "fallback visível... sempre presente" — fica satisfeito por um superconjunto: a via
 * de PIN não fica atrás de nenhum toque adicional, nunca escondida).
 */
export function UnlockPage() {
  const { unlock } = useAuth();
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [lockout, setLockout] = useState<LockoutStatus>({ locked: false, remainingAttempts: 5, lockedUntil: null });
  const [now, setNow] = useState(() => Date.now());
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const webauthnAttempted = useRef(false);

  useEffect(() => {
    void getLockoutStatus().then((status) => {
      setLockout(status);
      setIsCheckingSession(false);
    });
  }, []);

  // Contagem regressiva ao vivo (S-AUTH-05) — ao zerar, volta automaticamente ao
  // estado de desbloqueio pronto para nova tentativa (UX-SPEC 4.2).
  useEffect(() => {
    if (!lockout.locked || !lockout.lockedUntil) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lockout.locked, lockout.lockedUntil]);

  useEffect(() => {
    if (lockout.locked && lockout.lockedUntil && lockout.lockedUntil <= now) {
      void getLockoutStatus().then(setLockout);
    }
  }, [now, lockout.locked, lockout.lockedUntil]);

  // Prompt biométrico automático ao abrir (UX-SPEC S-AUTH-03 wireframe), uma única vez.
  useEffect(() => {
    if (webauthnAttempted.current || lockout.locked || isCheckingSession) return;
    if (!isWebAuthnAvailable()) return;
    webauthnAttempted.current = true;
    void authenticateWithWebAuthn()
      .then(async () => {
        await recordSuccessfulUnlock();
        unlock();
      })
      .catch((cause) => {
        // Sem credencial registrada, ou o usuário cancelou o prompt nativo — cai para
        // PIN silenciosamente (UX-SPEC 4.2: "biometria falha → fallback automático
        // para PIN, sem travar o usuário"). Falha de biometria não conta como
        // tentativa de PIN incorreta (DIR-18 é especificamente sobre PIN).
        if (!isNoCredentialsError(cause)) {
          // Erro inesperado (ex. 409 challenge_replayed) — sem ação bloqueante, só loga.
          console.warn("UnlockPage: autenticação WebAuthn falhou, seguindo com fallback de PIN", cause);
        }
      });
  }, [lockout.locked, isCheckingSession, unlock]);

  async function handlePinComplete(value: string) {
    const isValid = await verifyPin(value);
    if (isValid) {
      await recordSuccessfulUnlock();
      setPinError(null);
      unlock();
      return;
    }
    const status = await recordFailedAttempt();
    setLockout(status);
    setPinValue("");
    setPinError(
      status.locked
        ? "Muitas tentativas incorretas. Tente novamente mais tarde."
        : `PIN incorreto. ${status.remainingAttempts} ${status.remainingAttempts === 1 ? "tentativa restante" : "tentativas restantes"}.`,
    );
  }

  const remainingMs = lockout.lockedUntil ? lockout.lockedUntil - now : 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface-alt p-4 text-center">
      <div>
        <p className="text-2xl font-semibold text-primary">MyMoney</p>
        <p className="mt-2 text-lg text-neutral-700">🔒 Desbloqueie o app</p>
      </div>

      {lockout.locked ? (
        <div role="alert" className="flex flex-col items-center gap-2">
          <p className="text-sm text-neutral-700">Muitas tentativas. Tente novamente em</p>
          <p className="text-3xl font-semibold tabular-nums text-danger" aria-live="assertive">
            {formatCountdown(remainingMs)}
          </p>
        </div>
      ) : (
        <>
          <PinPad value={pinValue} onChange={setPinValue} onComplete={(v) => void handlePinComplete(v)} error={pinError ?? undefined} disabled={isCheckingSession} />
        </>
      )}

      {isWebAuthnAvailable() && !lockout.locked && (
        <button
          type="button"
          onClick={() => {
            webauthnAttempted.current = false;
            void authenticateWithWebAuthn()
              .then(async () => {
                await recordSuccessfulUnlock();
                unlock();
              })
              .catch(() => {
                /* fallback silencioso, mesmo tratamento do efeito automático acima */
              });
          }}
          className="min-h-11 text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          Tentar biometria novamente
        </button>
      )}
    </div>
  );
}
