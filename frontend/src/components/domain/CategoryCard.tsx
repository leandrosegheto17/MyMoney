import { useId } from "react";
import { Card } from "../base/Card";
import { formatCentsToBRL } from "../../lib/currency";

export interface CategoryCardProps {
  name: string;
  /** `Category.icon` (emoji), decorativo — `aria-hidden`, nunca a única via de identificação (nome sempre visível ao lado). */
  icon?: string | null;
  /** `Category.color`, aplicada como fundo do selo decorativo ao lado do ícone, se cadastrada. */
  color?: string | null;
  /** Soma de saídas do mês corrente da categoria + suas subcategorias (mesmo cálculo de RF-MVP-06/`get_monthly_category_summary`). */
  totalSpentCents: number;
  subcategoryCount: number;
  /** Ação primária (clique no corpo do card) — abre `S-CAT-01a` (subcategorias). */
  onOpenSubcategories: () => void;
  /** Ação secundária, `<button>` irmão do clicável primário — atalho direto para editar a categoria de topo-nível. */
  onEdit: () => void;
}

/**
 * CategoryCard — UX-SPEC.md Seção 2.1 (Padrão C — Grade de Cards de Resumo) e Seção
 * 3.3, usado por `S-CAT-01` (RF-REF-05). Card não é, ele mesmo, um único elemento
 * clicável: é um contêiner não-interativo (`Card`, um `<div>`) com dois elementos
 * interativos **irmãos** — o clicável primário (nome/ícone/total/contagem, cobre a
 * maior parte do card) e o botão secundário "Editar" — nunca um `<button>` aninhado
 * dentro de outro (Seção 5, linha "Card clicável").
 *
 * Acessibilidade (UX-SPEC Seção 5): `aria-label` do clicável primário descreve a
 * ação ("Ver subcategorias de {nome}", não só o nome); `aria-describedby` aponta
 * para o total gasto e a contagem de subcategorias, para que essa informação (visível
 * sem clique adicional, AC2) também chegue a quem usa leitor de tela, apesar de o
 * `aria-label` sobrescrever o texto visível como nome acessível do botão. Ordem de
 * tabulação: clicável primário antes do botão "Editar", mesma ordem do DOM.
 */
export function CategoryCard({ name, icon, color, totalSpentCents, subcategoryCount, onOpenSubcategories, onEdit }: CategoryCardProps) {
  const totalId = useId();
  const countId = useId();
  const subcategoryLabel = subcategoryCount === 1 ? "subcategoria" : "subcategorias";

  return (
    <Card className="relative min-w-0">
      <button
        type="button"
        onClick={onOpenSubcategories}
        aria-label={`Ver subcategorias de ${name}`}
        aria-describedby={`${totalId} ${countId}`}
        className="flex w-full min-w-0 flex-col items-start gap-1 rounded-md py-1 pb-9 text-left focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className="flex min-w-0 items-center gap-2">
          {(icon || color) && (
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-base"
              style={color ? { backgroundColor: color } : undefined}
            >
              {icon}
            </span>
          )}
          <span className="truncate font-medium text-neutral-900" title={name}>
            {name}
          </span>
        </span>
        <span id={totalId} className="text-sm text-neutral-600">
          {formatCentsToBRL(totalSpentCents)} este mês
        </span>
        <span id={countId} className="text-sm text-neutral-500">
          {subcategoryCount} {subcategoryLabel}
        </span>
      </button>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Editar ${name}`}
        className="absolute bottom-2 right-2 flex min-h-11 min-w-11 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span aria-hidden="true">✎</span>
      </button>
    </Card>
  );
}
