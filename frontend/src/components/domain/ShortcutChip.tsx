export interface ShortcutChipProps {
  /** Ícone decorativo (emoji, `Category.icon`) — sempre `aria-hidden`, o texto do rótulo já carrega o significado. */
  icon?: string | null;
  label: string;
  onClick: () => void;
}

/**
 * ShortcutChip — UX-SPEC.md Seção 3.3 (RF-REF-03): pílula clicável (`radius.full`) com
 * ícone + nome da subcategoria; ao clicar, abre `S-TXN-02` pré-preenchido (RN-13). Puramente
 * apresentacional — toda a lógica de pré-preenchimento/foco/submissão vive em quem a
 * consome (`ShortcutBar` → `TransactionsPage` → `TransactionFormModal`).
 *
 * Acessibilidade (UX-SPEC Seção 5, linha `ShortcutChip`): `<button>` nativo garante
 * navegação por teclado (Tab/Enter/Espaço) sem esforço adicional; `min-h-11` cobre o
 * alvo de toque mínimo de 44px; anel de foco visível herdado do padrão já usado por
 * `Button`. `aria-label` explícito combina ação + subcategoria ("Lançar em {label}")
 * — o texto visível (ícone + nome da subcategoria) sozinho não descreve a ação para
 * leitor de tela.
 */
export function ShortcutChip({ icon, label, onClick }: ShortcutChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Lançar em ${label}`}
      className={[
        "inline-flex min-h-11 shrink-0 scroll-ml-4 items-center gap-2 whitespace-nowrap rounded-full border border-neutral-300 bg-white px-4 py-2",
        "text-sm font-medium text-neutral-700 transition-colors duration-200 hover:bg-neutral-100",
        "focus-visible:outline-2 focus-visible:outline-primary",
        "[scroll-snap-align:start]",
      ].join(" ")}
    >
      {icon && (
        <span aria-hidden="true">{icon}</span>
      )}
      {label}
    </button>
  );
}
