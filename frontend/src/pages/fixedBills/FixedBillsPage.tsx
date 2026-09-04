import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, EmptyState, Modal, Select, Skeleton } from "../../components/base";
import { Input } from "../../components/base";
import { useToast } from "../../components/base/Toast";
import { CategoryPicker } from "../../components/domain/CategoryPicker";
import { CurrencyInput } from "../../components/domain/CurrencyInput";
import { createFixedBill, getFixedBillsStatus, listFixedBills, markFixedBillTransactionAsPaid } from "../../lib/api/fixedBills";
import { listAccounts } from "../../lib/api/accounts";
import { listCategories } from "../../lib/api/categories";
import { listPaymentMethods } from "../../lib/api/paymentMethods";
import { ApiError } from "../../lib/api/errors";
import { formatCentsToBRL } from "../../lib/currency";
import { todayDateOnly } from "../../lib/date";
import type { Account, Category, FixedBill, FixedBillStatusItem, NewFixedBill, PaymentMethod } from "../../lib/api/types";

type FormState = {
  description: string;
  amountCents: number;
  categoryId: string | null;
  subcategoryId: string | null;
  accountId: string;
  paymentMethodId: string;
  dueDay: string;
  alertDaysBefore: string;
};
function emptyForm(): FormState {
  return { description: "", amountCents: 0, categoryId: null, subcategoryId: null, accountId: "", paymentMethodId: "", dueDay: "10", alertDaysBefore: "3" };
}

/**
 * S-FIX-01/02/03 (FE-F2-05) — UX-SPEC.md Padrão A. Badge Pendente/Paga/Vencida (RN-05):
 * "Vencida" muda automaticamente sem ação manual porque `is_overdue` vem calculado pelo
 * servidor (`get_fixed_bills_status`, BE-F2-07) — nunca recalculado no client (DIR-06).
 */
export function FixedBillsPage() {
  const { showToast } = useToast();
  const [bills, setBills] = useState<FixedBill[] | null>(null);
  const [statuses, setStatuses] = useState<FixedBillStatusItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formErrors, setFormErrors] = useState<{ description?: string; amount?: string; category?: string; account?: string; paymentMethod?: string; dueDay?: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  async function load() {
    setLoadError(null);
    try {
      const [billList, statusList, accountList, categoryList, paymentMethodList] = await Promise.all([
        listFixedBills(),
        getFixedBillsStatus(),
        listAccounts({ onlyActive: true }),
        listCategories(),
        listPaymentMethods(),
      ]);
      setBills(billList);
      setStatuses(statusList);
      setAccounts(accountList);
      setCategories(categoryList);
      setPaymentMethods(paymentMethodList);
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : "Não foi possível carregar as contas fixas.");
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
    if (form.amountCents <= 0) nextErrors.amount = "Informe um valor maior que zero.";
    const categoryId = form.subcategoryId ?? form.categoryId;
    if (!categoryId) nextErrors.category = "Selecione a categoria.";
    if (!form.accountId) nextErrors.account = "Selecione a conta.";
    if (!form.paymentMethodId) nextErrors.paymentMethod = "Selecione a forma de pagamento.";
    const dueDayNum = Number(form.dueDay);
    if (!dueDayNum || dueDayNum < 1 || dueDayNum > 31) nextErrors.dueDay = "Informe um dia entre 1 e 31.";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const payload: NewFixedBill = {
        description: form.description.trim(),
        amount_cents: form.amountCents,
        category_id: categoryId as string,
        account_id: form.accountId,
        payment_method_id: form.paymentMethodId,
        due_day: dueDayNum,
        alert_days_before: Number(form.alertDaysBefore) || 3,
        start_date: todayDateOnly(),
      };
      await createFixedBill(payload);
      setIsFormOpen(false);
      showToast("Conta fixa cadastrada");
      await load();
    } catch (cause) {
      setSaveError(cause instanceof ApiError ? cause.message : "Não foi possível salvar a conta fixa.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMarkAsPaid(status: FixedBillStatusItem) {
    if (!status.current_transaction_id) return;
    setPayingId(status.fixed_bill_id);
    try {
      await markFixedBillTransactionAsPaid(status.current_transaction_id);
      showToast("Conta marcada como paga");
      await load();
    } catch (cause) {
      showToast(cause instanceof ApiError ? cause.message : "Não foi possível marcar como paga.", "danger");
    } finally {
      setPayingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Contas fixas</h1>
        <Button onClick={openNewForm}>+ Nova conta fixa</Button>
      </div>

      {loadError && <Alert variant="danger">{loadError}</Alert>}
      {!bills && !loadError && <Skeleton lines={4} aria-label="Carregando contas fixas" />}
      {bills && bills.length === 0 && <EmptyState title="Nenhuma conta fixa cadastrada ainda" action={<Button onClick={openNewForm}>Cadastrar</Button>} />}

      {bills && bills.length > 0 && (
        <ul className="flex flex-col gap-3">
          {bills.map((bill) => {
            const status = statuses.find((s) => s.fixed_bill_id === bill.id);
            const isPaid = status?.current_status === "cleared" || status?.current_status === "reconciled";
            const isOverdue = Boolean(status?.is_overdue) && !isPaid;
            return (
              <li key={bill.id}>
                <Card className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-neutral-900">{bill.description}</p>
                    <p className="text-sm text-neutral-500">
                      Vence dia {bill.due_day} · {formatCentsToBRL(bill.amount_cents)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isPaid && <Badge tone="income" icon="✓">Paga</Badge>}
                    {isOverdue && <Badge tone="danger" icon="⛔">Vencida</Badge>}
                    {!isPaid && !isOverdue && <Badge tone="neutral">Pendente</Badge>}
                    {!isPaid && status?.current_transaction_id && (
                      <Button variant="ghost" loading={payingId === bill.id} onClick={() => void handleMarkAsPaid(status)}>
                        Marcar como paga
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Nova conta fixa">
        <div className="flex flex-col gap-4">
          {saveError && <Alert variant="danger">{saveError}</Alert>}
          <Input label="Descrição" required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} error={formErrors.description} />
          <CurrencyInput label="Valor" required valueCents={form.amountCents} onValueChange={(cents) => setForm({ ...form, amountCents: cents })} error={formErrors.amount} />
          <CategoryPicker
            categories={categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parent_category_id }))}
            value={{ categoryId: form.categoryId, subcategoryId: form.subcategoryId }}
            onChange={(value) => setForm({ ...form, categoryId: value.categoryId, subcategoryId: value.subcategoryId })}
            error={formErrors.category}
            required
          />
          <Select label="Conta" required placeholder="Selecione" options={accounts.map((a) => ({ value: a.id, label: a.name }))} value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })} error={formErrors.account} />
          <Select
            label="Forma de pagamento"
            required
            placeholder="Selecione"
            options={paymentMethods.map((pm) => ({ value: pm.id, label: pm.name }))}
            value={form.paymentMethodId}
            onChange={(event) => setForm({ ...form, paymentMethodId: event.target.value })}
            error={formErrors.paymentMethod}
          />
          <Input label="Dia de vencimento" required type="number" min={1} max={31} value={form.dueDay} onChange={(event) => setForm({ ...form, dueDay: event.target.value })} error={formErrors.dueDay} />
          <Input label="Avisar com quantos dias de antecedência" type="number" min={0} max={30} value={form.alertDaysBefore} onChange={(event) => setForm({ ...form, alertDaysBefore: event.target.value })} helperText="Padrão: 3 dias (RN-05). Pode sobrescrever o limiar padrão desta conta fixa individualmente." />
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
