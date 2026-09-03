import { useEffect, useRef, useState } from "react";
import { Alert, Button, Input } from "../../components/base";
import { requestEmailMfaCode, verifyEmailMfaCode } from "../../lib/auth/emailMfa";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/errors";

const RESEND_COOLDOWN_S = 60;

/**
 * Passo de verificação do 2º fator por e-mail (`/auth-email-mfa`, `API-CONTRACT.yaml`
 * `BE-M-09`, RF-MVP-08) — exibido pelo `AuthGate` quando `stage === "needs-mfa"`.
 *
 * **Nota de lacuna de UX-SPEC.md sinalizada ao UX/UI** (`BLOCKERS.md`, Bloqueio 008):
 * `UX-SPEC.md` Seção 2.2 não desenha uma tela dedicada para este passo — a
 * numeração de tela pula de S-AUTH-01 para S-AUTH-03 (nenhuma "S-AUTH-02"), e
 * `RF-MVP-08` AC1 (PRD-TECNICO.md) só descreve PIN/biometria como gate de exibição de
 * dado financeiro, sem mencionar o 2º fator por e-mail que `auth-email-mfa` de fato
 * exige antes das 4 tabelas com gate de MFA (`accounts`/`categories`/
 * `payment_methods`/`transactions`) aceitarem qualquer operação. Esta implementação é
 * um preenchimento funcional mínimo (reaproveita só componentes já especificados —
 * `Input`, `Button`, `Alert` — sem inventar layout/interação nova), para não bloquear
 * toda a cadeia de telas de CRUD que dependem do gate de MFA; o UX/UI deve formalizar
 * "S-AUTH-02" com o layout definitivo, e este componente é revisado contra essa
 * especificação assim que publicada.
 */
export function EmailMfaStep() {
  const { session, refresh, signOut } = useAuth();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"sending" | "sent" | "error-sending">("sending");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const requestedOnce = useRef(false);

  async function requestCode() {
    setStatus("sending");
    setError(null);
    try {
      await requestEmailMfaCode();
      setStatus("sent");
      setCooldown(RESEND_COOLDOWN_S);
    } catch (cause) {
      setStatus("error-sending");
      setError(cause instanceof ApiError ? cause.message : "Não foi possível enviar o código. Tente novamente.");
    }
  }

  useEffect(() => {
    if (requestedOnce.current) return;
    requestedOnce.current = true;
    void requestCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleVerify() {
    setError(null);
    setIsVerifying(true);
    try {
      await verifyEmailMfaCode(code);
      await refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Código incorreto. Tente novamente.");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt p-4">
      <div className="w-full max-w-sm rounded-lg bg-surface p-6 shadow-elevation-md">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">Confirme seu e-mail</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Enviamos um código de 6 dígitos para <strong>{session?.user.email}</strong>.
        </p>

        {error && (
          <div className="mb-4">
            <Alert variant="danger">{error}</Alert>
          </div>
        )}
        {status === "sent" && !error && (
          <div className="mb-4">
            <Alert variant="info">Código enviado. Ele expira em 10 minutos.</Alert>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <Input
            label="Código de 6 dígitos"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            autoComplete="one-time-code"
          />

          <Button onClick={() => void handleVerify()} loading={isVerifying} loadingLabel="Verificando" disabled={code.length !== 6}>
            Verificar
          </Button>

          <button
            type="button"
            onClick={() => void requestCode()}
            disabled={cooldown > 0 || status === "sending"}
            className="min-h-11 text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-neutral-400 focus-visible:outline-2 focus-visible:outline-primary"
          >
            {cooldown > 0 ? `Reenviar código em ${cooldown}s` : "Reenviar código"}
          </button>

          <button
            type="button"
            onClick={() => void signOut()}
            className="min-h-11 text-sm text-neutral-500 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    </div>
  );
}
