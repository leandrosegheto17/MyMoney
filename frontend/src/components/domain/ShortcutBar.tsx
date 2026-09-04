import { ShortcutChip } from "./ShortcutChip";
import type { TransactionKind } from "../../lib/api/types";

export interface ShortcutBarItem {
  /** `category_id` retornado por `get_transaction_shortcuts()` — sempre o nó folha (subcategoria), RN-12. */
  categoryId: string;
  label: string;
  icon?: string | null;
  paymentMethodId: string | null;
  /** `categories.kind` da subcategoria (RN-13) — usado pelo formulário para pré-preencher entrada/saída. */
  kind: TransactionKind;
}

export interface ShortcutBarProps {
  /** `true` enquanto `get_transaction_shortcuts()` ainda não respondeu (`shortcuts === null` no chamador). */
  isLoading: boolean;
  items: ShortcutBarItem[];
  onSelect: (item: ShortcutBarItem) => void;
}

/** Larguras variáveis imitando texto de subcategoria (UX-SPEC.md Seção 4.2) — evita layout shift entre "sem barra" e "barra com N chips". */
const SKELETON_PILL_WIDTHS = ["5rem", "6.5rem", "4.5rem", "7.5rem", "5.5rem"];

/**
 * ShortcutBar — UX-SPEC.md Seção 2.2 (S-TXN-01), 3.3, 4.2 e 6.3 (RF-REF-03). Contêiner
 * que renderiza até 10 `ShortcutChip`; **não busca dado sozinha** — recebe `items` já
 * resolvidos pelo chamador (`TransactionsPage`, que consome `get_transaction_shortcuts()`,
 * `ADR-015`).
 *
 * Estados (UX-SPEC Seção 4.2):
 * - `isLoading`: `Skeleton` de pílulas (não o `Skeleton` genérico de linhas — formato
 *   próprio, largura variável).
 * - Sem `isLoading` e `items` vazio: **omite a barra por completo** (retorna `null`,
 *   não um `EmptyState` visível) — tanto para "sem lançamento no histórico" (AC2)
 *   quanto para falha silenciosa da RPC (o chamador trata os dois casos como `items: []`).
 * - Com itens: linha única com rolagem horizontal em mobile (`overflow-x-auto` +
 *   scroll-snap), `flex-wrap` a partir de `sm` (Seção 6.3).
 */
export function ShortcutBar({ isLoading, items, onSelect }: ShortcutBarProps) {
  if (isLoading) {
    return (
      <div role="status" aria-label="Carregando atalhos de lançamento" className="flex gap-2 overflow-x-auto">
        {SKELETON_PILL_WIDTHS.map((width, index) => (
          <div key={index} className="h-11 shrink-0 animate-pulse rounded-full bg-neutral-200" style={{ width }} />
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Atalhos de lançamento rápido"
      className="flex gap-2 overflow-x-auto pb-1 [scroll-snap-type:x_mandatory] sm:flex-wrap sm:overflow-x-visible sm:pb-0"
    >
      {items.map((item) => (
        <ShortcutChip key={item.categoryId} icon={item.icon} label={item.label} onClick={() => onSelect(item)} />
      ))}
    </div>
  );
}
