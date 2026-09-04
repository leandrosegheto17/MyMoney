import { useEffect, useState } from "react";
import { Alert, Button, Card, EmptyState, Modal, Select, Skeleton } from "../../components/base";
import { Input } from "../../components/base";
import { useToast } from "../../components/base/Toast";
import { CategoryPicker } from "../../components/domain/CategoryPicker";
import { CurrencyInput } from "../../components/domain/CurrencyInput";
import { InstallmentProgress } from "../../components/domain/InstallmentProgress";
import { createInstallmentPurchase, getInstallmentPurchasesProgress, listInstallmentPurchases } from "../../lib/api/recurring";
import { listAccounts } from "../../lib/api/accounts";
import { listCategories } from "../../lib/api/categories";
import { listPaymentMethods } from "../../lib/api/paymentMethods";
import { ApiError } from "../../lib/api/errors";
import { todayDateOnly } from "../../lib/date";
import type { Account, Category, InstallmentPurchase, InstallmentPurchaseProgress, NewInstallmentPurchase, PaymentMethod } from "../../lib/api/types";

type FormState = {
  description: string;
  totalAmountCents: number;
  installmentsCount: string;
  categoryId: string | null;
  subcategoryId: string | null;
  accountId: string;
  paymentMethodId: string;
  purchaseDate: string;
};
function emptyForm(): FormState {
  return { description: "", totalAmountCents: 0, installmentsCount: "2", categoryId: null, subcategoryId: null, accountId: "", paymentMethodId: "", purchaseDate: todayDateOnly() };
}

/** S-INST-01/02 (FE-F2-03) — UX-SPEC.md Padrão A + `InstallmentProgress` ("Parcela X de N", não percentual genérico). */
export function InstallmentsPage() {
  const { showToast } = useToast();
  const [purchases, setPurchases] = useState<InstallmentPurchase[] | null>(null);
  const [progress, setProgress] = useState<InstallmentPurchaseProgress[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formErrors, setFormErrors] = useState<{ description?: string; amount?: string; installments?: string; category?: string; account?: string; paymentMethod?: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const creditCardPaymentMethods = paymentMethods.filter((pm) => pm.type === "credit_card");

  async function load() {
    setLoadError(null);
    try {
      const [purchaseList, progressList, accountList, categoryList, paymentMethodList] = await Promise.all([
        listInstallmentPurchases(),
        getInstallmentPurchasesProgress(),
        listAccounts({ onlyActive: true }),
        listCategories(),
        listPaymentMethods(),
      ]);
      setPurchases(purchaseList);
      setProgress(progressList);
      setAccounts(accountList);
      setCategories(categoryList);
      setPaymentMethods(paymentMethodList);
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : "Não foi possível carregar as compras parceladas.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openNewForm() {
    setForm(emptyForm());
    setFormErrors({});
    setSaveError(null);
    setIsFormOpen(true);
  }

  async function handleSubmit() {
    const nextErrors: typeof formErrors = {};
    if (!form.description.trim()) nextErrors.description = "Informe uma descrição.";
    if (form.totalAmountCents <= 0) nextErrors.amount = "Informe um valor total maior que zero.";
    const installmentsCountNum = Number(form.installmentsCount);
    if (!installmentsCountNum || installmentsCountNum < 2) nextErrors.installments = "Informe ao menos 2 parcelas.";
    const categoryId = form.subcategoryId ?? form.categoryId;
    if (!categoryId) nextErrors.category = "Selecione a categoria.";
    if (!form.accountId) nextErrors.account = "Selecione a conta.";
    if (!form.paymentMethodId) nextErrors.paymentMethod = "Selecione o cartão de crédito.";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const payload: NewInstallmentPurchase = {
        description: form.description.trim(),
        total_amount_cents: form.totalAmountCents,
        installments_count: installmentsCountNum,
        category_id: categoryId as string,
        account_id: form.accountId,
        payment_method_id: form.paymentMethodId,
        purchase_date: form.purchaseDate,
      };
      await createInstallmentPurchase(payload);
      setIsFormOpen(false);
      showToast("Compra parcelada cadastrada");
      await load();
    } catch (cause) {
      setSaveError(cause instanceof ApiError ? cause.message : "Não foi possível salvar a compra parcelada.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Compras parceladas</h1>
        <Button onClick={openNewForm} disabled={creditCardPaymentMethods.length === 0}>
          + Nova compra parcelada
        </Button>
      </div>

      {creditCardPaymentMethods.length === 0 && purchases !== null && (
        <Alert variant="info">Cadastre um cartão de crédito para poder registrar compras parceladas.</Alert>
      )}

      {loadError && <Alert variant="danger">{loadError}</Alert>}
      {!purchases && !loadError && <Skeleton lines={4} aria-label="Carregando compras parceladas" />}
      {purchases && purchases.length === 0 && (
        <EmptyState title="Nenhuma compra parcelada ainda" action={<Button onClick={openNewForm} disabled={creditCardPaymentMethods.length === 0}>Cadastrar</Button>} />
      )}

      {purchases && purchases.length > 0 && (
        <ul className="flex flex-col gap-3">
          {purchases.map((purchase) => {
            const purchaseProgress = progress.find((p) => p.installment_purchase_id === purchase.id);
            return (
              <li key={purchase.id}>
                <Card>
                  <InstallmentProgress
                    description={purchase.description}
                    installmentsCount={purchaseProgress?.installments_count ?? purchase.installments_count}
                    generatedCount={purchaseProgress?.generated_count ?? 0}
                  />
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Nova compra parcelada">
        <div className="flex flex-col gap-4">
          {saveError && <Alert variant="danger">{saveError}</Alert>}
          <Input label="Descrição" required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} error={formErrors.description} />
          <CurrencyInput label="Valor total da compra" required valueCents={form.totalAmountCents} onValueChange={(cents) => setForm({ ...form, totalAmountCents: cents })} error={formErrors.amount} />
          <Input
            label="Número de parcelas"
            required
            type="number"
            min={2}
            value={form.installmentsCount}
            onChange={(event) => setForm({ ...form, installmentsCount: event.target.value })}
            error={formErrors.installments}
          />
          <CategoryPicker
            categories={categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parent_category_id }))}
            value={{ categoryId: form.categoryId, subcategoryId: form.subcategoryId }}
            onChange={(value) => setForm({ ...form, categoryId: value.categoryId, subcategoryId: value.subcategoryId })}
            error={formErrors.category}
            required
          />
          <Select
            label="Conta (débito das parcelas)"
            required
            placeholder="Selecione"
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            value={form.accountId}
            onChange={(event) => setForm({ ...form, accountId: event.target.value })}
            error={formErrors.account}
          />
          <Select
            label="Cartão de crédito"
            required
            placeholder="Selecione"
            options={creditCardPaymentMethods.map((pm) => ({ value: pm.id, label: pm.name }))}
            value={form.paymentMethodId}
            onChange={(event) => setForm({ ...form, paymentMethodId: event.target.value })}
            error={formErrors.paymentMethod}
          />
          <Input label="Data da compra" required type="date" value={form.purchaseDate} onChange={(event) => setForm({ ...form, purchaseDate: event.target.value })} />
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
    </div>
  );
}
