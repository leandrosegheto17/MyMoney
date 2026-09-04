import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, ConfirmationDialog, EmptyState, Input, Modal, Select } from "../../components/base";
import { useToast } from "../../components/base/Toast";
import { CategoryCard } from "../../components/domain/CategoryCard";
import { createCategory, deleteCategory, listCategories, listTransactionsByCategory, updateCategory } from "../../lib/api/categories";
import { getMonthlyCategorySummary } from "../../lib/api/dashboard";
import { ApiError } from "../../lib/api/errors";
import type { Category, CategoryKind, MonthlyCategorySummaryItem } from "../../lib/api/types";

/** Grade de cards de resumo — UX-SPEC.md Seção 2.1 (Padrão C) e 6.3 (1 → 2 → 3 → 4 colunas). */
const CARD_GRID_CLASSES = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
const SKELETON_CARD_COUNT = 6;

const KIND_LABELS: Record<CategoryKind, string> = { income: "Entrada", expense: "Saída" };
const KIND_OPTIONS = (Object.entries(KIND_LABELS) as [CategoryKind, string][]).map(([value, label]) => ({ value, label }));

type FormState = { id: string | null; name: string; kind: CategoryKind | ""; parentCategoryId: string };
const EMPTY_FORM: FormState = { id: null, name: "", kind: "", parentCategoryId: "" };

/**
 * S-CAT-01/02/03 — UX-SPEC.md Seção 2.2 (revisado 2026-09-04, RF-REF-05): grade de
 * `CategoryCard` (Padrão C) substitui a lista em árvore recolhível. Clique no corpo
 * do card abre `S-CAT-01a` (subcategorias, reaproveita `Modal`/`BottomSheet`); ícone
 * "Editar" do card é atalho direto para `S-CAT-02` sem passar pelo modal. Bloqueio de
 * exclusão (RN-09) inalterado.
 */
export function CategoriesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [categorySummary, setCategorySummary] = useState<MonthlyCategorySummaryItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<{ name?: string; kind?: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [blockedDelete, setBlockedDelete] = useState<{ category: Category; count: number } | null>(null);

  /** `S-CAT-01a` — categoria de topo-nível cujas subcategorias estão em exibição no Modal/BottomSheet. */
  const [subcategoriesModalCategory, setSubcategoriesModalCategory] = useState<Category | null>(null);

  async function load() {
    setLoadError(null);
    try {
      // `getMonthlyCategorySummary()` já é consumida pelo Dashboard (RF-MVP-06) —
      // reaproveitada aqui sem nenhuma chamada de API nova (RF-REF-05 AC2).
      const [categoriesResult, summaryResult] = await Promise.all([listCategories(), getMonthlyCategorySummary()]);
      setCategories(categoriesResult);
      setCategorySummary(summaryResult);
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : "Não foi possível carregar as categorias.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const rootCategories = useMemo(() => (categories ?? []).filter((category) => !category.parent_category_id), [categories]);
  const subcategoriesByParent = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const category of categories ?? []) {
      if (!category.parent_category_id) continue;
      const list = map.get(category.parent_category_id) ?? [];
      list.push(category);
      map.set(category.parent_category_id, list);
    }
    return map;
  }, [categories]);

  /** Total gasto no mês por categoria de topo-nível — saídas da própria categoria + suas subcategorias, mesmo cálculo de RF-MVP-06 (RF-REF-05 AC2). */
  const totalSpentByRoot = useMemo(() => {
    const categoryById = new Map((categories ?? []).map((category) => [category.id, category]));
    const totals = new Map<string, number>();
    for (const item of categorySummary ?? []) {
      if (item.kind !== "expense") continue;
      const category = categoryById.get(item.category_id);
      if (!category) continue;
      const rootId = category.parent_category_id ?? category.id;
      totals.set(rootId, (totals.get(rootId) ?? 0) + item.total_cents);
    }
    return totals;
  }, [categories, categorySummary]);

  function openNewForm(parentCategoryId = "") {
    setForm({ ...EMPTY_FORM, parentCategoryId });
    setFormErrors({});
    setSaveError(null);
    setIsFormOpen(true);
  }

  function openEditForm(category: Category) {
    setForm({ id: category.id, name: category.name, kind: category.kind, parentCategoryId: category.parent_category_id ?? "" });
    setFormErrors({});
    setSaveError(null);
    setIsFormOpen(true);
  }

  /** Abre `S-CAT-02` a partir de dentro de `S-CAT-01a` — um modal ativo por vez (fecha o de subcategorias primeiro). */
  function openEditFormFromSubcategoriesModal(category: Category) {
    setSubcategoriesModalCategory(null);
    openEditForm(category);
  }

  function openNewSubcategoryForm(parentCategoryId: string) {
    setSubcategoriesModalCategory(null);
    openNewForm(parentCategoryId);
  }

  function requestDeleteFromSubcategoriesModal(category: Category) {
    setSubcategoriesModalCategory(null);
    setDeleteTarget(category);
  }

  async function handleSubmit() {
    const nextErrors: { name?: string; kind?: string } = {};
    if (!form.name.trim()) nextErrors.name = "Informe um nome.";
    if (!form.kind) nextErrors.kind = "Selecione entrada ou saída.";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const payload = { name: form.name.trim(), kind: form.kind as CategoryKind, parent_category_id: form.parentCategoryId || null };
      if (form.id) {
        await updateCategory(form.id, payload);
      } else {
        await createCategory(payload);
      }
      setIsFormOpen(false);
      showToast(form.id ? "Categoria atualizada" : "Categoria criada");
      await load();
    } catch (cause) {
      setSaveError(cause instanceof ApiError ? cause.message : "Não foi possível salvar a categoria — verifique a hierarquia (RN-09).");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteCategory(deleteTarget.id);
      setDeleteTarget(null);
      showToast("Categoria excluída");
      await load();
    } catch (cause) {
      if (cause instanceof ApiError && cause.kind === "conflict") {
        const linked = await listTransactionsByCategory(deleteTarget.id);
        setBlockedDelete({ category: deleteTarget, count: linked.length });
        setDeleteTarget(null);
      } else {
        showToast(cause instanceof ApiError ? cause.message : "Não foi possível excluir.", "danger");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  const subcategoriesInModal = subcategoriesModalCategory ? subcategoriesByParent.get(subcategoriesModalCategory.id) ?? [] : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Categorias</h1>
        <Button onClick={() => openNewForm()}>+ Nova categoria</Button>
      </div>

      {loadError && <Alert variant="danger">{loadError}</Alert>}
      {!categories && !loadError && (
        <div role="status" aria-label="Carregando categorias" className={CARD_GRID_CLASSES}>
          {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-lg bg-neutral-200" />
          ))}
        </div>
      )}
      {categories && categories.length === 0 && (
        <EmptyState title="Nenhuma categoria cadastrada ainda" action={<Button onClick={() => openNewForm()}>Cadastrar</Button>} />
      )}

      {categories && rootCategories.length > 0 && (
        <div className={CARD_GRID_CLASSES}>
          {rootCategories.map((category) => (
            <CategoryCard
              key={category.id}
              name={category.name}
              icon={category.icon}
              color={category.color}
              totalSpentCents={totalSpentByRoot.get(category.id) ?? 0}
              subcategoryCount={(subcategoriesByParent.get(category.id) ?? []).length}
              onOpenSubcategories={() => setSubcategoriesModalCategory(category)}
              onEdit={() => openEditForm(category)}
            />
          ))}
        </div>
      )}

      {/* S-CAT-01a — UX-SPEC.md Seção 2.2 (bloco "S-CAT-01 revisado"): reaproveita Modal/BottomSheet, lista de subcategorias com ações Editar/Excluir. */}
      <Modal
        isOpen={subcategoriesModalCategory !== null}
        onClose={() => setSubcategoriesModalCategory(null)}
        title={subcategoriesModalCategory ? `${subcategoriesModalCategory.name} — subcategorias` : ""}
      >
        {subcategoriesModalCategory && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => openEditFormFromSubcategoriesModal(subcategoriesModalCategory)}>
                Editar categoria
              </Button>
              <Button variant="ghost" onClick={() => requestDeleteFromSubcategoriesModal(subcategoriesModalCategory)}>
                Excluir categoria
              </Button>
            </div>

            {subcategoriesInModal.length === 0 ? (
              <p className="text-sm text-neutral-500">Nenhuma subcategoria cadastrada ainda.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {subcategoriesInModal.map((sub) => (
                  <li key={sub.id} className="flex flex-wrap items-center justify-between gap-4">
                    <p className="min-w-0 flex-1 truncate text-sm text-neutral-700" title={sub.name}>
                      {sub.name}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" onClick={() => openEditFormFromSubcategoriesModal(sub)}>
                        Editar
                      </Button>
                      <Button variant="ghost" onClick={() => requestDeleteFromSubcategoriesModal(sub)}>
                        Excluir
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div>
              <Button variant="secondary" onClick={() => openNewSubcategoryForm(subcategoriesModalCategory.id)}>
                + Nova subcategoria
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={form.id ? "Editar categoria" : "Nova categoria"}>
        <div className="flex flex-col gap-4">
          {saveError && <Alert variant="danger">{saveError}</Alert>}
          <Input label="Nome" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} error={formErrors.name} />
          <Select
            label="Tipo"
            required
            placeholder="Selecione"
            options={KIND_OPTIONS}
            value={form.kind}
            onChange={(event) => setForm({ ...form, kind: event.target.value as CategoryKind })}
            error={formErrors.kind}
          />
          <Select
            label="Categoria pai"
            placeholder="Nenhuma (categoria raiz)"
            options={rootCategories.filter((c) => c.id !== form.id).map((c) => ({ value: c.id, label: c.name }))}
            value={form.parentCategoryId}
            onChange={(event) => setForm({ ...form, parentCategoryId: event.target.value })}
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
        title="Excluir categoria"
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"?`}
        confirmLabel="Excluir"
        isConfirming={isDeleting}
      />

      <Modal isOpen={blockedDelete !== null} onClose={() => setBlockedDelete(null)} title="Não é possível excluir">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-700">
            Esta categoria tem {blockedDelete?.count} {blockedDelete?.count === 1 ? "lançamento vinculado" : "lançamentos vinculados"}. Reclassifique-os antes de excluir.
          </p>
          <Button
            onClick={() => {
              const categoryId = blockedDelete?.category.id;
              setBlockedDelete(null);
              if (categoryId) navigate(`/lancamentos?categoria=${categoryId}`);
            }}
          >
            Ver lançamentos desta categoria
          </Button>
        </div>
      </Modal>
    </div>
  );
}
