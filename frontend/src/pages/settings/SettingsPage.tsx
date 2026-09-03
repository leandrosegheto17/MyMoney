import { useState } from "react";
import { Alert, Button, Card, Modal } from "../../components/base";
import { useToast } from "../../components/base/Toast";
import { PinPad } from "../../components/domain/PinPad";
import { useAuth } from "../../lib/auth/AuthContext";
import { setPin, verifyPin } from "../../lib/auth/pin";

type ChangePinStep = "current" | "new" | "confirm";

/** S-SET-01 — UX-SPEC.md Seção 2.2: "perfil (e-mail da conta Supabase Auth), botão 'Sair' (logout explícito, RF-MVP-08 AC3), 'Alterar PIN'." */
export function SettingsPage() {
  const { session, signOut } = useAuth();
  const { showToast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const [isChangingPin, setIsChangingPin] = useState(false);
  const [step, setStep] = useState<ChangePinStep>("current");
  const [pinValue, setPinValue] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  function openChangePin() {
    setStep("current");
    setPinValue("");
    setNewPin("");
    setError(null);
    setIsChangingPin(true);
  }

  async function handlePinPadComplete(value: string) {
    if (step === "current") {
      const isValid = await verifyPin(value);
      if (!isValid) {
        setError("PIN atual incorreto.");
        setPinValue("");
        return;
      }
      setError(null);
      setPinValue("");
      setStep("new");
      return;
    }
    if (step === "new") {
      setNewPin(value);
      setPinValue("");
      setStep("confirm");
      return;
    }
    // step === "confirm"
    if (value !== newPin) {
      setError("Os PINs não coincidem. Digite novamente.");
      setPinValue("");
      setNewPin("");
      setStep("new");
      return;
    }
    await setPin(value);
    setIsChangingPin(false);
    showToast("PIN alterado com sucesso");
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  const stepLabel = { current: "Digite seu PIN atual", new: "Digite o novo PIN", confirm: "Confirme o novo PIN" }[step];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">Configurações</h1>

      <Card>
        <p className="text-sm text-neutral-500">Conta</p>
        <p className="font-medium text-neutral-900">{session?.user.email}</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <Button variant="secondary" onClick={openChangePin}>
          Alterar PIN
        </Button>
        <Button variant="destructive" onClick={() => void handleSignOut()} loading={isSigningOut} loadingLabel="Saindo">
          Sair
        </Button>
      </Card>

      <Modal isOpen={isChangingPin} onClose={() => setIsChangingPin(false)} title="Alterar PIN">
        <div className="flex flex-col items-center gap-4">
          {error && (
            <div className="w-full">
              <Alert variant="danger">{error}</Alert>
            </div>
          )}
          <p className="text-sm text-neutral-600">{stepLabel}</p>
          <PinPad value={pinValue} onChange={setPinValue} onComplete={(value) => void handlePinPadComplete(value)} />
        </div>
      </Modal>
    </div>
  );
}
