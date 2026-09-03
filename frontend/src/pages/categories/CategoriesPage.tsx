import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Badge, Button, Card, ConfirmationDialog, EmptyState, Input, Modal, Select, Skeleton } from "../../components/base";
import { useToast } from "../../components/base/Toast";
import { createCategory, deleteCategory, listCategories, listTransactionsByCategory, updateCategory } from "../../lib/api/categories";
import { ApiError } from "../../lib/api/errors";
import type { Category, CategoryKind } from "../../lib/api/types";

const KIND_LABELS: Record<CategoryKind, string> = { income: "Entrada", expense: "Saída" };
const KIND_OPTIONS = (Object.entries(KIND_LABELS) as [CategoryKind, string][]).map(([value, label]) => ({ value, label }));

type FormState = { id: string | null; name: string; kind: CategoryKind | ""; parentCategoryId: string };
const EMPTY_FORM: FormState = { id: null, name: "", kind: "", parentCategoryId: "" };

/** S-CAT-01/02/03 — UX-SPEC.md Padrão A ("árvore, categoria com subcategorias recolhíveis") + bloqueio de exclusão (RN-09). */
export function CategoriesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<{ name?: string; kind?: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [blockedDelete, setBlockedDelete] = useState<{ category: Category; count: number } | null>(null);

  async function load() {
    setLoadError(null);
    try {
      setCategories(await listCategories());
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

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Categorias</h1>
        <Button onClick={() => openNewForm()}>+ Nova categoria</Button>
      </div>

      {loadError && <Alert variant="danger">{loadError}</Alert>}
      {!categories && !loadError && <Skeleton lines={5} aria-label="Carregando categorias" />}
      {categories && categories.length === 0 && (
        <EmptyState title="Nenhuma categoria cadastrada ainda" action={<Button onClick={() => openNewForm()}>Cadastrar</Button>} />
      )}

      {categories && rootCategories.length > 0 && (
        <ul className="flex flex-col gap-3">
          {rootCategories.map((category) => {
            const subcategories = subcategoriesByParent.get(category.id) ?? [];
            const isExpanded = expanded.has(category.id);
            return (
              <li key={category.id}>
                <Card>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      {subcategories.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(category.id)}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? `Recolher ${category.name}` : `Expandir ${category.name}`}
                          className="min-h-11 min-w-11 rounded-md text-neutral-500 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          {isExpanded ? "▾" : "▸"}
                        </button>
                      )}
                      <p className="font-medium text-neutral-900">{category.name}</p>
                      <Badge tone={category.kind === "income" ? "income" : "expense"}>{KIND_LABELS[category.kind]}</Badge>
                      {category.is_system_default && <Badge tone="neutral">Padrão</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => openNewForm(category.id)}>
                        + Subcategoria
                      </Button>
                      <Button variant="ghost" onClick={() => openEditForm(category)}>
                        Editar
                      </Button>
                      <Button variant="ghost" onClick={() => setDeleteTarget(category)}>
                        Excluir
                      </Button>
                    </div>
                  </div>
                  {isExpanded && subcategories.length > 0 && (
                    <ul className="ml-8 mt-3 flex flex-col gap-2 border-l border-neutral-200 pl-4">
                      {subcategories.map((sub) => (
                        <li key={sub.id} className="flex items-center justify-between gap-4">
                          <p className="text-sm text-neutral-700">{sub.name}</p>
                          <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => openEditForm(sub)}>
                              Editar
                            </Button>
                            <Button variant="ghost" onClick={() => setDeleteTarget(sub)}>
                              Excluir
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

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
