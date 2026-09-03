import { useState } from "react";
import { Alert, Button } from "../../components/base";
import { PinPad } from "../../components/domain/PinPad";
import { isValidPinFormat, PIN_LENGTH, setPin } from "../../lib/auth/pin";
import { isWebAuthnAvailable, registerWebAuthnCredential } from "../../lib/auth/webauthn";
import { useAuth } from "../../lib/auth/AuthContext";
import { ApiError } from "../../lib/api/errors";

type PinStep = "enter" | "confirm";
type Phase = "pin" | "biometric-offer";

/**
 * S-AUTH-04 — Setup de PIN, 1ª vez (UX-SPEC.md Seção 2.2): "Explicação curta...
 * teclado numérico grande... confirmação do PIN digitado 2x, oferta de 'Usar
 * biometria' (WebAuthn) se disponível... opção 'Pular por agora' **não disponível**"
 * — obrigatório (RF-MVP-08 AC1).
 */
export function PinSetupPage() {
  const { refresh, unlock } = useAuth();
  const [phase, setPhase] = useState<Phase>("pin");
  const [pinStep, setPinStep] = useState<PinStep>("enter");
  const [firstPin, setFirstPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegisteringBiometrics, setIsRegisteringBiometrics] = useState(false);

  function handleFirstComplete(value: string) {
    if (!isValidPinFormat(value)) return;
    setFirstPin(value);
    setPinStep("confirm");
    setError(null);
  }

  async function handleConfirmComplete(value: string) {
    if (value !== firstPin) {
      setError("Os PINs não coincidem. Digite novamente.");
      setConfirmPin("");
      setFirstPin("");
      setPinStep("enter");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await setPin(value);
      if (isWebAuthnAvailable()) {
        setPhase("biometric-offer");
      } else {
        await finishSetup();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o PIN. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  async function finishSetup() {
    await refresh();
    unlock();
  }

  async function handleEnableBiometrics() {
    setIsRegisteringBiometrics(true);
    setError(null);
    try {
      await registerWebAuthnCredential();
    } catch (cause) {
      // Biometria é reforço opcional (UX-SPEC: "oferta"), nunca bloqueia a conclusão
      // do setup — o PIN já está salvo e funcional independentemente deste resultado.
      setError(cause instanceof ApiError ? cause.message : "Não foi possível ativar a biometria agora — você ainda pode usar o PIN normalmente.");
    }
    await finishSetup();
  }

  async function handleSkipBiometrics() {
    await finishSetup();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt p-4">
      <div className="w-full max-w-sm rounded-lg bg-surface p-6 text-center shadow-elevation-md">
        {phase === "pin" ? (
          <>
            <h1 className="mb-1 text-xl font-semibold text-neutral-900">Configure um PIN</h1>
            <p className="mb-6 text-sm text-neutral-500">
              Configure um PIN de {PIN_LENGTH} dígitos para desbloquear o app rapidamente, mesmo sem conexão.
            </p>

            {error && (
              <div className="mb-4 text-left">
                <Alert variant="danger">{error}</Alert>
              </div>
            )}

            {pinStep === "enter" ? (
              <PinPad key="enter" value={firstPin} onChange={setFirstPin} onComplete={handleFirstComplete} disabled={isSaving} />
            ) : (
              <PinPad key="confirm" value={confirmPin} onChange={setConfirmPin} onComplete={(v) => void handleConfirmComplete(v)} disabled={isSaving} />
            )}
            <p className="mt-4 text-sm text-neutral-500">{pinStep === "enter" ? "Digite um PIN novo" : "Confirme o PIN digitado"}</p>
          </>
        ) : (
          <>
            <h1 className="mb-1 text-xl font-semibold text-neutral-900">Usar biometria?</h1>
            <p className="mb-6 text-sm text-neutral-500">
              Além do PIN, você pode usar a biometria/senha do dispositivo para desbloquear mais rápido.
            </p>
            {error && (
              <div className="mb-4 text-left">
                <Alert variant="warning">{error}</Alert>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Button onClick={() => void handleEnableBiometrics()} loading={isRegisteringBiometrics}>
                Usar biometria
              </Button>
              <Button variant="ghost" onClick={() => void handleSkipBiometrics()} disabled={isRegisteringBiometrics}>
                Continuar só com PIN
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
