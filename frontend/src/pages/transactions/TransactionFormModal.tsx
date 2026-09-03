import { useEffect, useState } from "react";
import { Alert, Button, DatePicker, Input, Modal, Select } from "../../components/base";
import { CategoryPicker } from "../../components/domain/CategoryPicker";
import type { CategoryTaxonomyItem } from "../../components/domain/CategoryPicker";
import { CurrencyInput } from "../../components/domain/CurrencyInput";
import { createTransaction, updateTransaction } from "../../lib/api/transactions";
import { ApiError } from "../../lib/api/errors";
import { enqueueTransaction } from "../../lib/offline/queue";
import { todayDateOnly } from "../../lib/date";
import type { Account, PaymentMethod, Transaction, TransactionKind } from "../../lib/api/types";

export interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onQueuedOffline: () => void;
  accounts: Account[];
  paymentMethods: PaymentMethod[];
  categories: CategoryTaxonomyItem[];
  /** Presente = edição; ausente = novo lançamento (S-TXN-02). */
  editingTransaction: Transaction | null;
}

interface FormErrors {
  date?: string;
  account?: string;
  paymentMethod?: string;
  category?: string;
  amount?: string;
}

/**
 * S-TXN-02 — Novo/Editar lançamento manual (UX-SPEC.md Seção 2.2): "Data | Conta |
 * Forma de pagamento | Categoria > Subcategoria | Valor | Tipo (Entrada/Saída,
 * toggle) | Descrição. Campos obrigatórios marcados com `*`; validação inline por
 * campo ao perder foco e no submit (RF-MVP-04 AC2)."
 */
export function TransactionFormModal({
  isOpen,
  onClose,
  onSaved,
  onQueuedOffline,
  accounts,
  paymentMethods,
  categories,
  editingTransaction,
}: TransactionFormModalProps) {
  const [date, setDate] = useState(todayDateOnly());
  const [accountId, setAccountId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [categoryValue, setCategoryValue] = useState<{ categoryId: string | null; subcategoryId: string | null }>({
    categoryId: null,
    subcategoryId: null,
  });
  const [amountCents, setAmountCents] = useState(0);
  const [kind, setKind] = useState<TransactionKind>("expense");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingTransaction) {
      setDate(editingTransaction.transaction_date);
      setAccountId(editingTransaction.account_id);
      setPaymentMethodId(editingTransaction.payment_method_id ?? "");
      const category = categories.find((c) => c.id === editingTransaction.category_id);
      setCategoryValue(
        category?.parentId
          ? { categoryId: category.parentId, subcategoryId: category.id }
          : { categoryId: editingTransaction.category_id, subcategoryId: null },
      );
      setAmountCents(editingTransaction.amount_cents);
      setKind(editingTransaction.kind);
      setDescription(editingTransaction.description ?? "");
    } else {
      setDate(todayDateOnly());
      setAccountId("");
      setPaymentMethodId("");
      setCategoryValue({ categoryId: null, subcategoryId: null });
      setAmountCents(0);
      setKind("expense");
      setDescription("");
    }
    setErrors({});
    setBanner(null);
  }, [isOpen, editingTransaction, categories]);

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    if (!date) nextErrors.date = "Informe a data.";
    if (!accountId) nextErrors.account = "Selecione a conta.";
    if (!paymentMethodId) nextErrors.paymentMethod = "Selecione a forma de pagamento.";
    if (!categoryValue.categoryId) nextErrors.category = "Selecione a categoria.";
    if (amountCents <= 0) nextErrors.amount = "Informe um valor maior que zero.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setBanner(null);
    setIsSaving(true);

    const categoryId = categoryValue.subcategoryId ?? categoryValue.categoryId ?? undefined;
    const payload = {
      account_id: accountId,
      kind,
      amount_cents: amountCents,
      transaction_date: date,
      payment_method_id: paymentMethodId || undefined,
      category_id: categoryId,
      description: description.trim() || undefined,
    };

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, payload);
      } else {
        await createTransaction(payload);
      }
      onSaved();
    } catch (cause) {
      if (!editingTransaction && cause instanceof ApiError && cause.kind === "network") {
        // DIR-11/RNF-04: sem conexão, cai para a fila offline em vez de perder o lançamento digitado.
        await enqueueTransaction({
          accountId,
          paymentMethodId,
          categoryId: categoryValue.categoryId ?? "",
          subcategoryId: categoryValue.subcategoryId,
          amountCents,
          type: kind === "income" ? "entrada" : "saida",
          description,
          date,
        });
        onQueuedOffline();
      } else {
        setBanner(cause instanceof ApiError ? cause.message : "Não foi possível salvar o lançamento. Tente novamente.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingTransaction ? "Editar lançamento" : "Novo lançamento"}>
      <div className="flex flex-col gap-4">
        {banner && <Alert variant="danger">{banner}</Alert>}

        <div className="flex gap-2" role="group" aria-label="Tipo de lançamento">
          <Button variant={kind === "expense" ? "primary" : "secondary"} onClick={() => setKind("expense")} type="button">
            Saída
          </Button>
          <Button variant={kind === "income" ? "primary" : "secondary"} onClick={() => setKind("income")} type="button">
            Entrada
          </Button>
        </div>

        <DatePicker label="Data" required value={date} onChange={(event) => setDate(event.target.value)} error={errors.date} />

        <Select
          label="Conta"
          required
          placeholder="Selecione"
          options={accounts.map((account) => ({ value: account.id, label: account.name }))}
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          error={errors.account}
        />

        <Select
          label="Forma de pagamento"
          required
          placeholder="Selecione"
          options={paymentMethods.map((method) => ({ value: method.id, label: method.name }))}
          value={paymentMethodId}
          onChange={(event) => setPaymentMethodId(event.target.value)}
          error={errors.paymentMethod}
        />

        <CategoryPicker categories={categories} value={categoryValue} onChange={setCategoryValue} required error={errors.category} />

        <CurrencyInput label="Valor" required valueCents={amountCents} onValueChange={setAmountCents} error={errors.amount} />

        <Input label="Descrição" value={description} onChange={(event) => setDescription(event.target.value)} />

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} loading={isSaving}>
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
