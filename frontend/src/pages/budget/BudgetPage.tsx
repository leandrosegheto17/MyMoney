import { useEffect, useState } from "react";
import { Alert, Button, ConfirmationDialog, EmptyState, Modal, Select } from "../../components/base";
import { useToast } from "../../components/base/Toast";
import { BudgetCard } from "../../components/domain/BudgetCard";
import { CurrencyInput } from "../../components/domain/CurrencyInput";
import { createBudget, deleteBudget, getBudgetStatus, listBudgets, monthKey, updateBudget } from "../../lib/api/budget";
import { listCategories } from "../../lib/api/categories";
import { ApiError } from "../../lib/api/errors";
import type { Budget, BudgetStatusItem, Category } from "../../lib/api/types";

const THRESHOLD_OPTIONS = [
  { value: "70", label: "70%" },
  { value: "80", label: "80% (padrão)" },
  { value: "90", label: "90%" },
];

/** Grade de cards de resumo — UX-SPEC.md Seção 2.1 (Padrão C) e 6.3 (1 → 2 → 3 → 4 colunas), mesma grade compartilhada com `S-CAT-01`. */
const CARD_GRID_CLASSES = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
const SKELETON_CARD_COUNT = 6;

/**
 * S-BUD-01/02 — UX-SPEC.md Seção 2.2 (revisado 2026-09-04, RF-REF-06): grade de
 * `BudgetCard` (Padrão C) substitui a lista com `ProgressBar` solto. Clique no
 * corpo do card (única ação do card) abre `S-BUD-02` para editar o teto,
 * inalterado; `ProgressBar`/indicadores de severidade (RN-04) reaproveitados
 * dentro do card, sem alteração de cálculo/dado (nenhuma chamada de API nova).
 * A ação "Remover orçamento", antes um botão solto ao lado de "Editar" na lista,
 * foi movida para dentro do formulário `S-BUD-02` (ver `requestDeleteFromForm`) —
 * decisão de detalhe registrada em `TASK.md` FE-REF-07: o `BudgetCard` só expõe a
 * ação primária (Padrão C, sem ação secundária própria neste card, diferente do
 * `CategoryCard`), e nem `UX-SPEC.md` nem o critério de aceite de RF-REF-06 exigem
 * remoção da capacidade de excluir orçamento já existente no MVP — mesmo fluxo de
 * exclusão (`deleteBudget`/`ConfirmationDialog`) preservado sem alteração.
 *
 * **Correção de achado de qualidade (2026-09-04, regressão funcional, AC1)**: o
 * card de edição/exclusão é dirigido inteiramente por `BudgetStatusItem`
 * (`statuses`), nunca por `budgets.find(...)`. `getBudgetStatus()` resolve o mês
 * corrente **no servidor** (`America/Sao_Paulo`), enquanto `listBudgets()` (usado
 * só para excluir categorias já orçadas no formulário de novo orçamento, ver
 * `budgetedCategoryIds` abaixo) é uma listagem simples sem filtro de mês local —
 * em qualquer divergência de fuso entre os dois, um `.find()` cruzando os dois
 * poderia falhar silenciosamente e fazer o card sumir da grade inteira (nenhum
 * `EmptyState`, porque `statuses.length` não é 0). `BudgetStatusItem` já carrega
 * `budget_id`/`category_id`/`limit_cents`/`alert_threshold_pct` — tudo que
 * `openEditForm`/`confirmDelete` precisam — então o cruzamento com `budgets` deixa
 * de ser necessário para renderizar/editar/excluir.
 */
export function BudgetPage() {
  const { showToast } = useToast();
  const [statuses, setStatuses] = useState<BudgetStatusItem[] | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetStatusItem | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [limitCents, setLimitCents] = useState(0);
  const [thresholdPct, setThresholdPct] = useState("80");
  const [formErrors, setFormErrors] = useState<{ category?: string; limit?: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BudgetStatusItem | null>(null);
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

  /** Clique no `BudgetCard` (elemento clicável primário, Padrão C) — abre `S-BUD-02`, dirigido 100% por `status` (ver nota de correção acima). */
  function openEditForm(status: BudgetStatusItem) {
    setEditingBudget(status);
    setCategoryId(status.category_id);
    setLimitCents(status.limit_cents);
    setThresholdPct(String(status.alert_threshold_pct));
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
        await updateBudget(editingBudget.budget_id, { limit_cents: limitCents, alert_threshold_pct: Number(thresholdPct) });
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

  /** `S-BUD-02`, botão "Remover orçamento" (ver nota acima) — fecha o formulário e reabre a confirmação já existente. */
  function requestDeleteFromForm() {
    if (!editingBudget) return;
    setIsFormOpen(false);
    setDeleteTarget(editingBudget);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBudget(deleteTarget.budget_id);
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
      {!statuses && !loadError && (
        <div role="status" aria-label="Carregando orçamentos" className={CARD_GRID_CLASSES}>
          {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-lg bg-neutral-200" />
          ))}
        </div>
      )}
      {statuses && statuses.length === 0 && (
        <EmptyState title="Nenhum orçamento definido este mês" action={<Button onClick={openNewForm}>Cadastrar</Button>} />
      )}

      {statuses && statuses.length > 0 && (
        <div className={CARD_GRID_CLASSES}>
          {statuses.map((status) => (
            <BudgetCard
              key={status.budget_id}
              categoryName={status.category_name}
              spentCents={status.spent_cents}
              limitCents={status.limit_cents}
              pctSpent={status.pct_spent}
              alertLevel={status.alert_level}
              onEdit={() => openEditForm(status)}
            />
          ))}
        </div>
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            {editingBudget ? (
              <Button variant="ghost" onClick={requestDeleteFromForm} disabled={isSaving}>
                Remover orçamento
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={() => void handleSubmit()} loading={isSaving}>
                Salvar
              </Button>
            </div>
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
