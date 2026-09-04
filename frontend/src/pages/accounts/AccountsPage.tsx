import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, ConfirmationDialog, EmptyState, Modal, Select, Skeleton } from "../../components/base";
import { Input } from "../../components/base";
import { CurrencyInput } from "../../components/domain/CurrencyInput";
import { createAccount, deleteAccount, inactivateAccount, listAccounts, updateAccount } from "../../lib/api/accounts";
import { ApiError } from "../../lib/api/errors";
import { formatCentsToBRL } from "../../lib/currency";
import type { Account, AccountType, NewAccount } from "../../lib/api/types";
import { useToast } from "../../components/base/Toast";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  wallet: "Carteira",
  investment: "Investimento",
};
const ACCOUNT_TYPE_OPTIONS = (Object.entries(ACCOUNT_TYPE_LABELS) as [AccountType, string][]).map(([value, label]) => ({ value, label }));

type FormState = { name: string; type: AccountType | ""; initialBalanceCents: number };
const EMPTY_FORM: FormState = { name: "", type: "", initialBalanceCents: 0 };

/**
 * S-ACC-01/02/04 — UX-SPEC.md Padrão A (lista + form CRUD) e Padrão B (confirmação de
 * inativação, RN-08). "Card de conta mostra saldo atual em destaque, cor neutra."
 */
export function AccountsPage() {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<{ name?: string; type?: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [deleteConflict, setDeleteConflict] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function load() {
    setLoadError(null);
    try {
      setAccounts(await listAccounts());
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : "Não foi possível carregar as contas.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openNewForm() {
    setEditingAccount(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSaveError(null);
    setIsFormOpen(true);
  }

  function openEditForm(account: Account) {
    setEditingAccount(account);
    setForm({ name: account.name, type: account.type, initialBalanceCents: account.initial_balance_cents });
    setFormErrors({});
    setSaveError(null);
    setIsFormOpen(true);
  }

  async function handleSubmit() {
    const nextErrors: { name?: string; type?: string } = {};
    if (!form.name.trim()) nextErrors.name = "Informe um nome para a conta.";
    if (!form.type) nextErrors.type = "Selecione o tipo da conta.";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const payload: NewAccount = { name: form.name.trim(), type: form.type as AccountType, currency: "BRL", initial_balance_cents: form.initialBalanceCents };
      if (editingAccount) {
        await updateAccount(editingAccount.id, payload);
      } else {
        await createAccount(payload);
      }
      setIsFormOpen(false);
      showToast(editingAccount ? "Conta atualizada com sucesso" : "Conta criada com sucesso");
      await load();
    } catch (cause) {
      setSaveError(cause instanceof ApiError ? cause.message : "Não foi possível salvar a conta.");
    } finally {
      setIsSaving(false);
    }
  }

  function askDelete(account: Account) {
    setDeleteTarget(account);
    setDeleteConflict(false);
  }

  async function confirmDeleteOrInactivate() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteConflict) {
        await inactivateAccount(deleteTarget.id);
        showToast("Conta inativada");
      } else {
        await deleteAccount(deleteTarget.id);
        showToast("Conta excluída");
      }
      setDeleteTarget(null);
      await load();
    } catch (cause) {
      if (cause instanceof ApiError && cause.kind === "conflict") {
        setDeleteConflict(true);
      } else {
        showToast(cause instanceof ApiError ? cause.message : "Não foi possível concluir a ação.", "danger");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Contas</h1>
        <Button onClick={openNewForm}>+ Nova conta</Button>
      </div>

      {loadError && <Alert variant="danger">{loadError}</Alert>}
      {!accounts && !loadError && <Skeleton lines={4} aria-label="Carregando contas" />}

      {accounts && accounts.length === 0 && (
        <EmptyState title="Nenhuma conta cadastrada ainda" description="Cadastre sua primeira conta para começar." action={<Button onClick={openNewForm}>Cadastrar</Button>} />
      )}

      {accounts && accounts.length > 0 && (
        <ul className="flex flex-col gap-3">
          {accounts.map((account) => (
            <li key={account.id}>
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-neutral-900" title={account.name}>
                      {account.name}
                    </p>
                    {!account.is_active && <Badge tone="neutral">Inativa</Badge>}
                  </div>
                  <p className="text-sm text-neutral-500">{ACCOUNT_TYPE_LABELS[account.type]}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <p className="text-lg font-semibold tabular-nums text-neutral-800">{formatCentsToBRL(account.current_balance_cents)}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => openEditForm(account)}>
                      Editar
                    </Button>
                    <Button variant="ghost" onClick={() => askDelete(account)}>
                      Excluir
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingAccount ? "Editar conta" : "Nova conta"}>
        <div className="flex flex-col gap-4">
          {saveError && <Alert variant="danger">{saveError}</Alert>}
          <Input label="Nome" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} error={formErrors.name} />
          <Select
            label="Tipo"
            required
            placeholder="Selecione"
            options={ACCOUNT_TYPE_OPTIONS}
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value as AccountType })}
            error={formErrors.type}
          />
          <CurrencyInput label="Saldo inicial" valueCents={form.initialBalanceCents} onValueChange={(cents) => setForm({ ...form, initialBalanceCents: cents })} />
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
        onConfirm={() => void confirmDeleteOrInactivate()}
        title={deleteConflict ? "Inativar conta" : "Excluir conta"}
        description={
          deleteConflict
            ? "Esta conta tem lançamentos vinculados. Ela será inativada, não excluída — o histórico permanece intacto."
            : `Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`
        }
        confirmLabel={deleteConflict ? "Inativar" : "Excluir"}
        confirmVariant={deleteConflict ? "primary" : "destructive"}
        isConfirming={isDeleting}
      />
    </div>
  );
}
