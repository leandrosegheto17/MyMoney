import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, ConfirmationDialog, EmptyState, Modal, Select, Skeleton } from "../../components/base";
import { Input } from "../../components/base";
import { useToast } from "../../components/base/Toast";
import { CategoryPicker } from "../../components/domain/CategoryPicker";
import { CurrencyInput } from "../../components/domain/CurrencyInput";
import {
  createRecurringTemplate,
  createRecurringTemplateAdjustment,
  deleteRecurringTemplate,
  listRecurringTemplates,
  updateRecurringTemplate,
} from "../../lib/api/recurring";
import { listAccounts } from "../../lib/api/accounts";
import { listCategories } from "../../lib/api/categories";
import { listPaymentMethods } from "../../lib/api/paymentMethods";
import { ApiError } from "../../lib/api/errors";
import { formatCentsToBRL } from "../../lib/currency";
import { todayDateOnly } from "../../lib/date";
import type { Account, Category, NewRecurringTemplate, PaymentMethod, RecurringTemplate } from "../../lib/api/types";

type FormState = {
  description: string;
  amountCents: number;
  categoryId: string | null;
  subcategoryId: string | null;
  accountId: string;
  paymentMethodId: string;
  dayOfMonth: string;
  startDate: string;
};
function emptyForm(): FormState {
  return { description: "", amountCents: 0, categoryId: null, subcategoryId: null, accountId: "", paymentMethodId: "", dayOfMonth: "5", startDate: todayDateOnly() };
}

/** Próximos 12 meses (incluindo o corrente), formato `YYYY-MM-01` — janela válida de `effective_from` (RN-02, nunca retroativo). */
function upcomingMonthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() + index, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    const label = formatter.format(date);
    return { value, label: label.charAt(0).toUpperCase() + label.slice(1) };
  });
}

/** S-REC-01/02/03/04 (FE-F2-04) — UX-SPEC.md Padrão A + Padrão B (S-REC-03). */
export function RecurringPage() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<RecurringTemplate[] | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formErrors, setFormErrors] = useState<{ description?: string; amount?: string; category?: string; account?: string; paymentMethod?: string; dayOfMonth?: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // S-REC-03 — reajuste: 2 passos (form → confirmação explícita, RF-F2-03 AC1).
  const [adjustTarget, setAdjustTarget] = useState<RecurringTemplate | null>(null);
  const [adjustAmountCents, setAdjustAmountCents] = useState(0);
  const [adjustEffectiveFrom, setAdjustEffectiveFrom] = useState("");
  const [adjustFormError, setAdjustFormError] = useState<string | null>(null);
  const [isAdjustConfirmOpen, setIsAdjustConfirmOpen] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // S-REC-04 — encerramento (RN-07: histórico preservado, só `end_date`).
  const [endTarget, setEndTarget] = useState<RecurringTemplate | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  async function load() {
    setLoadError(null);
    try {
      const [templateList, accountList, categoryList, paymentMethodList] = await Promise.all([
        listRecurringTemplates(),
        listAccounts({ onlyActive: true }),
        listCategories(),
        listPaymentMethods(),
      ]);
      setTemplates(templateList);
      setAccounts(accountList);
      setCategories(categoryList);
      setPaymentMethods(paymentMethodList);
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : "Não foi possível carregar as recorrências.");
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
    const dayNum = Number(form.dayOfMonth);
    if (!dayNum || dayNum < 1 || dayNum > 31) nextErrors.dayOfMonth = "Informe um dia entre 1 e 31.";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const payload: NewRecurringTemplate = {
        description: form.description.trim(),
        amount_cents: form.amountCents,
        category_id: categoryId as string,
        account_id: form.accountId,
        payment_method_id: form.paymentMethodId,
        day_of_month: dayNum,
        start_date: form.startDate,
      };
      await createRecurringTemplate(payload);
      setIsFormOpen(false);
      showToast("Recorrência cadastrada");
      await load();
    } catch (cause) {
      setSaveError(cause instanceof ApiError ? cause.message : "Não foi possível salvar a recorrência.");
    } finally {
      setIsSaving(false);
    }
  }

  function openAdjust(template: RecurringTemplate) {
    setAdjustTarget(template);
    setAdjustAmountCents(template.amount_cents);
    setAdjustEffectiveFrom(upcomingMonthOptions()[0].value);
    setAdjustFormError(null);
    setAdjustError(null);
  }

  function requestAdjustConfirmation() {
    if (adjustAmountCents <= 0) {
      setAdjustFormError("Informe um valor maior que zero.");
      return;
    }
    setAdjustFormError(null);
    setIsAdjustConfirmOpen(true);
  }

  async function confirmAdjust() {
    if (!adjustTarget) return;
    setIsAdjusting(true);
    setAdjustError(null);
    try {
      await createRecurringTemplateAdjustment({
        recurring_template_id: adjustTarget.id,
        effective_from: adjustEffectiveFrom,
        amount_cents: adjustAmountCents,
      });
      setIsAdjustConfirmOpen(false);
      setAdjustTarget(null);
      showToast("Reajuste cadastrado");
      await load();
    } catch (cause) {
      setAdjustError(cause instanceof ApiError ? cause.message : "Não foi possível aplicar o reajuste.");
    } finally {
      setIsAdjusting(false);
    }
  }

  async function confirmEnd() {
    if (!endTarget) return;
    setIsEnding(true);
    try {
      await updateRecurringTemplate(endTarget.id, { end_date: todayDateOnly() });
      setEndTarget(null);
      showToast("Recorrência encerrada — o histórico permanece intacto");
      await load();
    } catch (cause) {
      showToast(cause instanceof ApiError ? cause.message : "Não foi possível encerrar.", "danger");
    } finally {
      setIsEnding(false);
    }
  }

  async function handleDelete(template: RecurringTemplate) {
    try {
      await deleteRecurringTemplate(template.id);
      showToast("Recorrência excluída — lançamentos já gerados permanecem no histórico");
      await load();
    } catch (cause) {
      showToast(cause instanceof ApiError ? cause.message : "Não foi possível excluir.", "danger");
    }
  }

  const monthOptions = upcomingMonthOptions();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Gastos recorrentes</h1>
        <Button onClick={openNewForm}>+ Nova recorrência</Button>
      </div>

      {loadError && <Alert variant="danger">{loadError}</Alert>}
      {!templates && !loadError && <Skeleton lines={4} aria-label="Carregando recorrências" />}
      {templates && templates.length === 0 && <EmptyState title="Nenhuma recorrência cadastrada ainda" action={<Button onClick={openNewForm}>Cadastrar</Button>} />}

      {templates && templates.length > 0 && (
        <ul className="flex flex-col gap-3">
          {templates.map((template) => {
            const isEnded = Boolean(template.end_date) && template.end_date! <= todayDateOnly();
            return (
              <li key={template.id}>
                <Card className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-900">{template.description}</p>
                      <p className="text-sm text-neutral-500">Todo dia {template.day_of_month} · {formatCentsToBRL(template.amount_cents)}</p>
                    </div>
                    {isEnded ? <Badge tone="neutral">Encerrada</Badge> : <Badge tone="primary">Ativa</Badge>}
                  </div>
                  {!isEnded && (
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => openAdjust(template)}>
                        Reajustar valor
                      </Button>
                      <Button variant="ghost" onClick={() => setEndTarget(template)}>
                        Encerrar
                      </Button>
                      <Button variant="ghost" onClick={() => void handleDelete(template)}>
                        Excluir
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Nova recorrência">
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
          <Input label="Dia do mês" required type="number" min={1} max={31} value={form.dayOfMonth} onChange={(event) => setForm({ ...form, dayOfMonth: event.target.value })} error={formErrors.dayOfMonth} />
          <Input label="Começa em" required type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
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

      {/* S-REC-03 — passo 1: novo valor + competência. */}
      <Modal isOpen={adjustTarget !== null && !isAdjustConfirmOpen} onClose={() => setAdjustTarget(null)} title="Reajustar valor">
        <div className="flex flex-col gap-4">
          {adjustFormError && <Alert variant="danger">{adjustFormError}</Alert>}
          <CurrencyInput label="Novo valor" required valueCents={adjustAmountCents} onValueChange={setAdjustAmountCents} />
          <Select
            label="A partir de qual competência o novo valor passa a valer?"
            required
            options={monthOptions}
            value={adjustEffectiveFrom}
            onChange={(event) => setAdjustEffectiveFrom(event.target.value)}
          />
          <p className="text-sm text-neutral-500">Lançamentos já gerados em meses anteriores não mudam.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdjustTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={requestAdjustConfirmation}>Continuar</Button>
          </div>
        </div>
      </Modal>

      {/* S-REC-03 — passo 2: confirmação explícita (RF-F2-03 AC1) antes de aplicar. */}
      <ConfirmationDialog
        isOpen={isAdjustConfirmOpen}
        onClose={() => setIsAdjustConfirmOpen(false)}
        onConfirm={() => void confirmAdjust()}
        title="Confirmar reajuste"
        description={
          <>
            {adjustError && <p className="mb-2 text-danger">{adjustError}</p>}
            <p>
              O valor de <strong>{adjustTarget?.description}</strong> passa a ser{" "}
              <strong>{formatCentsToBRL(adjustAmountCents)}</strong> a partir de{" "}
              <strong>{monthOptions.find((m) => m.value === adjustEffectiveFrom)?.label}</strong>. Lançamentos já gerados em meses
              anteriores não mudam.
            </p>
          </>
        }
        confirmLabel="Confirmar reajuste"
        confirmVariant="primary"
        isConfirming={isAdjusting}
      />

      <ConfirmationDialog
        isOpen={endTarget !== null}
        onClose={() => setEndTarget(null)}
        onConfirm={() => void confirmEnd()}
        title="Encerrar recorrência"
        description={`Tem certeza que deseja encerrar "${endTarget?.description}"? Os lançamentos já gerados permanecem no histórico (RN-07) — nenhum lançamento novo será criado a partir de agora.`}
        confirmLabel="Encerrar"
        confirmVariant="destructive"
        isConfirming={isEnding}
      />
    </div>
  );
}
