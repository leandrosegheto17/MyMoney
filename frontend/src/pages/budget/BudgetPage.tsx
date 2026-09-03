import { useEffect, useState } from "react";
import { Alert, Button, Card, ConfirmationDialog, EmptyState, Modal, Select, Skeleton } from "../../components/base";
import { useToast } from "../../components/base/Toast";
import { ProgressBar } from "../../components/domain/ProgressBar";
import { CurrencyInput } from "../../components/domain/CurrencyInput";
import { createBudget, deleteBudget, getBudgetStatus, listBudgets, monthKey, updateBudget } from "../../lib/api/budget";
import { listCategories } from "../../lib/api/categories";
import { ApiError } from "../../lib/api/errors";
import { formatCentsToBRL } from "../../lib/currency";
import type { Budget, BudgetStatusItem, Category } from "../../lib/api/types";

const THRESHOLD_OPTIONS = [
  { value: "70", label: "70%" },
  { value: "80", label: "80% (padrão)" },
  { value: "90", label: "90%" },
];

/** S-BUD-01/02 — UX-SPEC.md Padrão A + `ProgressBar` (3 estados, RN-04). */
export function BudgetPage() {
  const { showToast } = useToast();
  const [statuses, setStatuses] = useState<BudgetStatusItem[] | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [limitCents, setLimitCents] = useState(0);
  const [thresholdPct, setThresholdPct] = useState("80");
  const [formErrors, setFormErrors] = useState<{ category?: string; limit?: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function load() {
    setLoadError(null);
    try {
      const [statusList, budgetList, categoryList] = await Promise.all([getBudgetStatus(), listBudgets(), listCategories()]);
      setStatuses(statusList);
      setBudgets(budgetList);
      setCategories(categoryList);
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : "Não foi possível carregar os orçamentos.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const budgetedCategoryIds = new Set(budgets.map((b) => b.category_id));
  const availableCategories = categories.filter((c) => !budgetedCategoryIds.has(c.id) || c.id === editingBudget?.category_id);

  function openNewForm() {
    setEditingBudget(null);
    setCategoryId("");
    setLimitCents(0);
    setThresholdPct("80");
    setFormErrors({});
    setSaveError(null);
    setIsFormOpen(true);
  }

  function openEditForm(budget: Budget) {
    setEditingBudget(budget);
    setCategoryId(budget.category_id);
    setLimitCents(budget.limit_cents);
    setThresholdPct(String(budget.alert_threshold_pct));
    setFormErrors({});
    setSaveError(null);
    setIsFormOpen(true);
  }

  async function handleSubmit() {
    const nextErrors: { category?: string; limit?: string } = {};
    if (!categoryId) nextErrors.category = "Selecione a categoria.";
    if (limitCents <= 0) nextErrors.limit = "Informe um teto maior que zero.";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, { limit_cents: limitCents, alert_threshold_pct: Number(thresholdPct) });
      } else {
        await createBudget({ category_id: categoryId, month: monthKey(), limit_cents: limitCents, alert_threshold_pct: Number(thresholdPct) });
      }
      setIsFormOpen(false);
      showToast("Orçamento salvo");
      await load();
    } catch (cause) {
      setSaveError(cause instanceof ApiError ? cause.message : "Não foi possível salvar o orçamento.");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBudget(deleteTarget.id);
      setDeleteTarget(null);
      showToast("Orçamento removido");
      await load();
    } catch (cause) {
      showToast(cause instanceof ApiError ? cause.message : "Não foi possível remover.", "danger");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Orçamento</h1>
        <Button onClick={openNewForm}>+ Novo orçamento</Button>
      </div>

      {loadError && <Alert variant="danger">{loadError}</Alert>}
      {!statuses && !loadError && <Skeleton lines={4} aria-label="Carregando orçamentos" />}
      {statuses && statuses.length === 0 && (
        <EmptyState title="Nenhum orçamento definido este mês" action={<Button onClick={openNewForm}>Cadastrar</Button>} />
      )}

      {statuses && statuses.length > 0 && (
        <ul className="flex flex-col gap-3">
          {statuses.map((status) => {
            const budget = budgets.find((b) => b.id === status.budget_id);
            return (
              <li key={status.budget_id}>
                <Card>
                  <ProgressBar
                    label={status.category_name}
                    pctSpent={status.pct_spent}
                    alertLevel={status.alert_level}
                    detailText={`${formatCentsToBRL(status.spent_cents)} de ${formatCentsToBRL(status.limit_cents)}`}
                  />
                  {budget && (
                    <div className="mt-2 flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => openEditForm(budget)}>
                        Editar
                      </Button>
                      <Button variant="ghost" onClick={() => setDeleteTarget(budget)}>
                        Remover
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingBudget ? "Editar orçamento" : "Novo orçamento"}>
        <div className="flex flex-col gap-4">
          {saveError && <Alert variant="danger">{saveError}</Alert>}
          <Select
            label="Categoria"
            required
            placeholder="Selecione"
            disabled={Boolean(editingBudget)}
            options={availableCategories.map((c) => ({ value: c.id, label: c.name }))}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            error={formErrors.category}
          />
          <CurrencyInput label="Teto" required valueCents={limitCents} onValueChange={setLimitCents} error={formErrors.limit} />
          <Select label="Limiar de alerta" options={THRESHOLD_OPTIONS} value={thresholdPct} onChange={(event) => setThresholdPct(event.target.value)} />
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
        title="Remover orçamento"
        description="Tem certeza que deseja remover este orçamento?"
        confirmLabel="Remover"
        isConfirming={isDeleting}
      />
    </div>
  );
}
