import { useEffect, useState } from "react";
import { Alert, Button, Card, Modal } from "../../components/base";
import { useToast } from "../../components/base/Toast";
import { PinPad } from "../../components/domain/PinPad";
import { useAuth } from "../../lib/auth/AuthContext";
import { setPin, verifyPin } from "../../lib/auth/pin";
import { getExistingPushSubscription, isPushSupported, subscribeToPush, unsubscribeFromPush } from "../../lib/push/subscribe";

type ChangePinStep = "current" | "new" | "confirm";

/** S-SET-01 — UX-SPEC.md Seção 2.2: "perfil (e-mail da conta Supabase Auth), botão 'Sair' (logout explícito, RF-MVP-08 AC3), 'Alterar PIN'." */
export function SettingsPage() {
  const { session, signOut } = useAuth();
  const { showToast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // S-SET-02 (FE-F2-09) — toggle real de push por dispositivo (persiste em `push_subscriptions`, BE-F2-09).
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isTogglingPush, setIsTogglingPush] = useState(false);
  const pushSupported = isPushSupported();

  useEffect(() => {
    if (!pushSupported) return;
    getExistingPushSubscription()
      .then((subscription) => setPushEnabled(subscription !== null))
      .catch(() => undefined);
  }, [pushSupported]);

  async function handleTogglePush() {
    setIsTogglingPush(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
        showToast("Notificações push desativadas neste dispositivo");
      } else {
        const ok = await subscribeToPush();
        setPushEnabled(ok);
        showToast(ok ? "Notificações push ativadas neste dispositivo" : "Não foi possível ativar push — verifique a permissão do navegador", ok ? "success" : "danger");
      }
    } finally {
      setIsTogglingPush(false);
    }
  }

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

      {/* S-SET-02 — toggles de notificação (Fase 2). */}
      <Card className="flex flex-col gap-3">
        <h2 className="font-medium text-neutral-900">Notificações</h2>
        <label className="flex min-h-11 items-center gap-3 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={pushEnabled}
            disabled={!pushSupported || isTogglingPush}
            onChange={() => void handleTogglePush()}
            className="h-5 w-5 rounded border-neutral-300 text-primary focus-visible:outline-2 focus-visible:outline-primary"
          />
          Notificações push neste dispositivo
        </label>
        {!pushSupported && <p className="text-xs text-neutral-500">Não disponível neste navegador.</p>}
        <p className="text-xs text-neutral-500">
          A Central de notificações (sino no topo) sempre mostra o histórico completo de avisos de orçamento e conta fixa,
          independente de push estar ativado (DIR-14).
        </p>
        <p className="text-xs text-neutral-500">
          <strong>Achado (FE-F2-09):</strong> o backend ainda não modela uma preferência de usuário para silenciar um tipo
          de notificação individualmente (orçamento vs. conta fixa) — hoje o único controle real é ativar/desativar push
          neste dispositivo, acima; alertas continuam sempre visíveis na Central de notificações.
        </p>
      </Card>

      {/* S-SET-03 — limiares padrão (Fase 2). */}
      <Card className="flex flex-col gap-2">
        <h2 className="font-medium text-neutral-900">Limiares de alerta</h2>
        <p className="text-sm text-neutral-600">
          O limiar de alerta de orçamento (padrão 80%, RN-04) e os dias de aviso de conta fixa (padrão 3 dias, RN-05) são
          configurados individualmente em cada orçamento (Orçamento &gt; editar) e em cada conta fixa (Contas fixas &gt;
          editar) — o valor padrão do sistema já é aplicado automaticamente a todo novo cadastro.
        </p>
        <p className="text-xs text-neutral-500">
          <strong>Achado (FE-F2-09):</strong> `API-CONTRACT.yaml`/o schema de `public` não expõem uma tabela de
          preferências de usuário para sobrescrever esse padrão globalmente (não existe `user_settings`/coluna
          equivalente) — implementar aqui um "limiar padrão do usuário" persistente exigiria uma migration nova do
          Backend, fora do escopo desta tarefa de Frontend. Documentado como achado em vez de simular uma persistência
          que não existiria de fato (só localStorage, perdida ao trocar de dispositivo).
        </p>
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
