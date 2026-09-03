import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Skeleton } from "../../components/base";
import { listCategories } from "../../lib/api/categories";
import { ApiError } from "../../lib/api/errors";
import type { Category } from "../../lib/api/types";

/**
 * S-ONB-02 — Onboarding passo 2/2 (UX-SPEC.md Seção 2.2): "lista da taxonomia padrão
 * de categorias/subcategorias pré-cadastrada (RN-09), com aviso '100% editável
 * depois' e botão 'Concluir' — não bloqueia edição posterior."
 */
export function TaxonomyReviewPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : "Não foi possível carregar as categorias."));
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt p-4">
      <div className="w-full max-w-md rounded-lg bg-surface p-6 shadow-elevation-md">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">Passo 2 de 2</p>
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">Suas categorias já vêm prontas</h1>
        <p className="mb-4 text-sm text-neutral-500">100% editável depois, em Categorias.</p>

        {error && (
          <div className="mb-4">
            <Alert variant="danger">{error}</Alert>
          </div>
        )}

        {!categories && !error && <Skeleton lines={5} aria-label="Carregando categorias" />}

        {categories && (
          <ul className="mb-6 flex max-h-72 flex-col gap-2 overflow-y-auto">
            {rootCategories.map((category) => (
              <li key={category.id}>
                <p className="font-medium text-neutral-800">{category.name}</p>
                {(subcategoriesByParent.get(category.id) ?? []).length > 0 && (
                  <ul className="ml-4 mt-1 flex flex-col gap-1">
                    {subcategoriesByParent.get(category.id)!.map((sub) => (
                      <li key={sub.id} className="text-sm text-neutral-500">
                        {sub.name}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        <Button onClick={() => navigate("/", { replace: true })}>Concluir</Button>
      </div>
    </div>
  );
}
