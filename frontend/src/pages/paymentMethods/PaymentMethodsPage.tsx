import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, ConfirmationDialog, EmptyState, Input, Modal, Select, Skeleton } from "../../components/base";
import { useToast } from "../../components/base/Toast";
import { createPaymentMethod, deletePaymentMethod, listPaymentMethods } from "../../lib/api/paymentMethods";
import { ApiError } from "../../lib/api/errors";
import type { PaymentMethod, PaymentMethodType } from "../../lib/api/types";

const TYPE_LABELS: Record<PaymentMethodType, string> = {
  pix: "Pix",
  debit_card: "Cartão de débito",
  credit_card: "Cartão de crédito",
  boleto: "Boleto",
  cash: "Dinheiro",
};
// Nota de detalhe (pequeno desvio, documentado): `API-CONTRACT.yaml` exige `type` no
// POST (`NewPaymentMethod`), mas UX-SPEC.md Seção 2.2 (S-PAY-01/02) só lista "Nome,
// ícone (opcional)" no formulário de forma customizada. "Crédito" exige `credit_card_id`
// (só existe a partir de `BE-F2-01`, Fase 2) — omitido das opções aqui no MVP.
const TYPE_OPTIONS: { value: PaymentMethodType; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "debit_card", label: "Cartão de débito" },
  { value: "boleto", label: "Boleto" },
  { value: "cash", label: "Dinheiro" },
];

/** S-PAY-01/02 — UX-SPEC.md Padrão A. "As 5 formas padrão vêm com badge 'Padrão', não editáveis/excluíveis; customizadas têm ação de editar/excluir." */
export function PaymentMethodsPage() {
  const { showToast } = useToast();
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<PaymentMethodType | "">("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function load() {
    setLoadError(null);
    try {
      setMethods(await listPaymentMethods());
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : "Não foi possível carregar as formas de pagamento.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openNewForm() {
    setName("");
    setType("");
    setNameError(null);
    setTypeError(null);
    setSaveError(null);
    setIsFormOpen(true);
  }

  async function handleSubmit() {
    const hasNameError = !name.trim();
    const hasTypeError = !type;
    setNameError(hasNameError ? "Informe um nome." : null);
    setTypeError(hasTypeError ? "Selecione o tipo." : null);
    if (hasNameError || hasTypeError) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      await createPaymentMethod({ name: name.trim(), type: type as PaymentMethodType });
      setIsFormOpen(false);
      showToast("Forma de pagamento criada");
      await load();
    } catch (cause) {
      setSaveError(cause instanceof ApiError ? cause.message : "Não foi possível salvar.");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deletePaymentMethod(deleteTarget.id);
      setDeleteTarget(null);
      showToast("Forma de pagamento excluída");
      await load();
    } catch (cause) {
      showToast(cause instanceof ApiError ? cause.message : "Não foi possível excluir.", "danger");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Formas de pagamento</h1>
        <Button onClick={openNewForm}>+ Nova forma</Button>
      </div>

      {loadError && <Alert variant="danger">{loadError}</Alert>}
      {!methods && !loadError && <Skeleton lines={4} aria-label="Carregando formas de pagamento" />}
      {methods && methods.length === 0 && (
        <EmptyState title="Nenhuma forma de pagamento cadastrada ainda" action={<Button onClick={openNewForm}>Cadastrar</Button>} />
      )}

      {methods && methods.length > 0 && (
        <ul className="flex flex-col gap-3">
          {methods.map((method) => (
            <li key={method.id}>
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-neutral-900" title={method.name}>
                      {method.name}
                    </p>
                    {method.is_system_default && <Badge tone="primary">Padrão</Badge>}
                  </div>
                  <p className="text-sm text-neutral-500">{TYPE_LABELS[method.type]}</p>
                </div>
                {!method.is_system_default && (
                  <Button variant="ghost" onClick={() => setDeleteTarget(method)}>
                    Excluir
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Nova forma de pagamento">
        <div className="flex flex-col gap-4">
          {saveError && <Alert variant="danger">{saveError}</Alert>}
          <Input label="Nome" required value={name} onChange={(event) => setName(event.target.value)} error={nameError ?? undefined} />
          <Select
            label="Tipo"
            required
            placeholder="Selecione"
            options={TYPE_OPTIONS}
            value={type}
            onChange={(event) => setType(event.target.value as PaymentMethodType)}
            error={typeError ?? undefined}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit()} loading={isSaving}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title="Excluir forma de pagamento"
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"?`}
        confirmLabel="Excluir"
        isConfirming={isDeleting}
      />
    </div>
  );
}
