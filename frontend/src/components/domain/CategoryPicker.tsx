import { useEffect, useId, useMemo } from "react";
import { FieldLabel, FieldMessage } from "../base/FieldChrome";

export interface CategoryTaxonomyItem {
  id: string;
  name: string;
  /** `null`/ausente = categoria raiz; presente = subcategoria de outra entrada desta mesma lista (Category.self-reference, SDD Seção 5). */
  parentId?: string | null;
}

export interface CategoryPickerValue {
  categoryId: string | null;
  subcategoryId: string | null;
}

export interface CategoryPickerProps {
  /** Taxonomia completa (categorias + subcategorias) — vinda de estado vivo (query/cache), nunca de uma cópia estática, para refletir edição em tempo real (RF-MVP-03 AC2). */
  categories: CategoryTaxonomyItem[];
  value: CategoryPickerValue;
  onChange: (value: CategoryPickerValue) => void;
  categoryLabel?: string;
  subcategoryLabel?: string;
  error?: string;
  required?: boolean;
}

/**
 * CategoryPicker — UX-SPEC.md Seção 3.3: seleção em 2 níveis (categoria > subcategoria),
 * reflete mudanças de taxonomia em tempo real (RF-MVP-03 AC2). Recebe a taxonomia via
 * prop (não busca dados sozinho) — re-renderiza automaticamente sempre que o
 * chamador atualizar `categories` a partir da fonte viva (cache/query), sem exigir
 * reload de página.
 */
export function CategoryPicker({
  categories,
  value,
  onChange,
  categoryLabel = "Categoria",
  subcategoryLabel = "Subcategoria",
  error,
  required,
}: CategoryPickerProps) {
  const categoryFieldId = useId();
  const subcategoryFieldId = useId();
  const errorId = `${categoryFieldId}-error`;

  const rootCategories = useMemo(() => categories.filter((item) => !item.parentId), [categories]);
  const subcategories = useMemo(
    () => (value.categoryId ? categories.filter((item) => item.parentId === value.categoryId) : []),
    [categories, value.categoryId],
  );

  // Taxonomia é passada como estado vivo e pode mudar sob os pés do usuário (RF-MVP-03
  // AC2 — reflete edição em tempo real): se a subcategoria selecionada deixar de existir
  // na lista recalculada (removida/reparentada em outra aba/usuário), limpa a seleção em
  // vez de deixar `value.subcategoryId` referenciar um id que não existe mais na árvore
  // atual (o <select> já cai para "Nenhuma" visualmente, mas o valor ficava desatualizado).
  useEffect(() => {
    if (value.subcategoryId && !subcategories.some((item) => item.id === value.subcategoryId)) {
      onChange({ categoryId: value.categoryId, subcategoryId: null });
    }
  }, [subcategories, value.categoryId, value.subcategoryId, onChange]);

  function handleCategoryChange(categoryId: string) {
    // Trocar a categoria pai sempre reseta a subcategoria — evita estado inconsistente
    // (subcategoria de uma árvore diferente da categoria selecionada).
    onChange({ categoryId: categoryId || null, subcategoryId: null });
  }

  function handleSubcategoryChange(subcategoryId: string) {
    onChange({ ...value, subcategoryId: subcategoryId || null });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="flex flex-1 flex-col gap-1">
        <FieldLabel htmlFor={categoryFieldId} required={required}>
          {categoryLabel}
        </FieldLabel>
        <select
          id={categoryFieldId}
          required={required}
          value={value.categoryId ?? ""}
          onChange={(event) => handleCategoryChange(event.target.value)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
          className={[
            "min-h-11 rounded-md border bg-white px-3 py-2 text-base text-neutral-900",
            "focus-visible:outline-2 focus-visible:outline-primary",
            error ? "border-danger" : "border-neutral-300",
          ].join(" ")}
        >
          <option value="">Selecione</option>
          {rootCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <FieldLabel htmlFor={subcategoryFieldId}>{subcategoryLabel}</FieldLabel>
        <select
          id={subcategoryFieldId}
          value={value.subcategoryId ?? ""}
          onChange={(event) => handleSubcategoryChange(event.target.value)}
          disabled={!value.categoryId || subcategories.length === 0}
          className={[
            "min-h-11 rounded-md border bg-white px-3 py-2 text-base text-neutral-900",
            "focus-visible:outline-2 focus-visible:outline-primary border-neutral-300",
            "disabled:bg-neutral-100 disabled:text-neutral-400",
          ].join(" ")}
        >
          <option value="">
            {value.categoryId ? "Nenhuma" : "Selecione a categoria primeiro"}
          </option>
          {subcategories.map((subcategory) => (
            <option key={subcategory.id} value={subcategory.id}>
              {subcategory.name}
            </option>
          ))}
        </select>
      </div>
      <FieldMessage id={errorId} error={error} className="sm:basis-full" />
    </div>
  );
}
