import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AuthCard, AuthLayout, Button, Input, Select } from "../../components/base";
import { CurrencyInput } from "../../components/domain/CurrencyInput";
import { createAccount } from "../../lib/api/accounts";
import { ApiError } from "../../lib/api/errors";
import type { AccountType } from "../../lib/api/types";

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "checking", label: "Conta corrente" },
  { value: "savings", label: "Poupança" },
  { value: "wallet", label: "Carteira" },
  { value: "investment", label: "Investimento" },
];

/**
 * S-ONB-01 — Onboarding passo 1/2 (UX-SPEC.md Seção 2.2): "Vamos cadastrar sua
 * primeira conta — formulário reduzido (nome, tipo, saldo inicial), sem opção de
 * pular (RF-MVP-01 é pré-requisito estrutural)."
 */
export function FirstAccountPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType | "">("");
  const [initialBalanceCents, setInitialBalanceCents] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const hasNameError = name.trim() === "";
    const hasTypeError = type === "";
    setNameError(hasNameError ? "Informe um nome para a conta." : null);
    setTypeError(hasTypeError ? "Selecione o tipo da conta." : null);
    if (hasNameError || hasTypeError) return;

    setIsSubmitting(true);
    try {
      await createAccount({ name: name.trim(), type: type as AccountType, currency: "BRL", initial_balance_cents: initialBalanceCents });
      navigate("/onboarding/categorias", { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Não foi possível criar a conta. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <AuthCard
        eyebrow="Passo 1 de 2"
        title="Vamos cadastrar sua primeira conta"
        description="Toda organização financeira começa por aqui."
      >
        {error && (
          <div className="mb-4">
            <Alert variant="danger">{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Input label="Nome da conta" required value={name} onChange={(event) => setName(event.target.value)} error={nameError ?? undefined} />
          <Select
            label="Tipo"
            required
            placeholder="Selecione"
            options={ACCOUNT_TYPE_OPTIONS}
            value={type}
            onChange={(event) => setType(event.target.value as AccountType)}
            error={typeError ?? undefined}
          />
          <CurrencyInput label="Saldo inicial" valueCents={initialBalanceCents} onValueChange={setInitialBalanceCents} />

          <Button type="submit" loading={isSubmitting} loadingLabel="Criando conta">
            Continuar
          </Button>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
