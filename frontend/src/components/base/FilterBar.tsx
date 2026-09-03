import type { ReactNode } from "react";

export interface FilterBarProps {
  /** Controles de filtro individuais (ex.: `Select` de conta/forma de pagamento/categoria, `DatePicker` de período). */
  children: ReactNode;
  onClear?: () => void;
  label?: string;
}

/**
 * FilterBar — UX-SPEC.md Seção 3.2: conjunto de filtros (conta, forma de pagamento,
 * categoria, período), usado em S-TXN-01. Agnóstico dos campos concretos — cada
 * tela de domínio (FE-M-09 em diante) compõe os `Select`/`DatePicker` que fazem
 * sentido para aquela lista. `role="search"` + `aria-label` dão contexto a leitor de
 * tela sobre o agrupamento; layout em coluna única no mobile, em linha a partir de `sm`.
 */
export function FilterBar({ children, onClear, label = "Filtros" }: FilterBarProps) {
  return (
    <div role="search" aria-label={label} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      {children}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="min-h-11 rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
