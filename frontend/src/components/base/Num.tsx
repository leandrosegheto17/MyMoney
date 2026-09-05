import { formatCentsToBRL } from "../../lib/currency";

export type NumFormat = "currency" | "percent" | "count";

export interface NumProps {
  /**
   * `format="currency"`: valor em **centavos** (mesma convenção de `src/lib/currency.ts`).
   * `format="percent"`: percentual já calculado pelo chamador (ex. `87`, não `0.87`).
   * `format="count"`: contagem inteira (ex. lançamentos do mês).
   */
  value: number;
  format: NumFormat;
  /** Casas decimais — só se aplica a `format="percent"` (padrão 0). `currency` usa sempre 2 casas (`formatCentsToBRL`); `count` é sempre inteiro. */
  decimals?: number;
  className?: string;
}

const PERCENT_FORMATTER_CACHE = new Map<number, Intl.NumberFormat>();

function percentFormatter(decimals: number): Intl.NumberFormat {
  let formatter = PERCENT_FORMATTER_CACHE.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    PERCENT_FORMATTER_CACHE.set(decimals, formatter);
  }
  return formatter;
}

const COUNT_FORMATTER = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

function formatValue(value: number, format: NumFormat, decimals: number): string {
  switch (format) {
    case "currency":
      return formatCentsToBRL(value);
    case "percent":
      return `${percentFormatter(decimals).format(value)}%`;
    case "count":
      return COUNT_FORMATTER.format(Math.trunc(value));
    default:
      // Exaustividade de `NumFormat` garantida em tempo de compilação — nunca alcançado em runtime.
      return String(value);
  }
}

/**
 * `Num` — UX-SPEC.md Seção 3.2, `adr/019-tipografia-numerica-seletiva-primitivo-num-migracao-incremental.md`.
 *
 * Primitivo de renderização de número em `Newsreader` (`font-variant-numeric:
 * tabular-nums`) — introduzido no Lote 0 (FE-RS-02), migração incremental dos
 * pontos de chamada de `formatCentsToBRL()`/percentual/contagem cru já existentes
 * é feita lote a lote (`DIR-41`), **não** por esta tarefa.
 *
 * Renderiza sempre um `<span>` isolado — nunca aceita `children`, para impedir que
 * um número seja concatenado a texto não-numérico no mesmo nó (o caso que motivou
 * o Bloqueio 022/ADR-019, ex. `BudgetCard.tsx` antes de sua própria migração). Um
 * componente consumidor que hoje formata `` `${seta} ${formatCentsToBRL(x)}` `` ou
 * `` `${valor} de ${limite}` `` precisa separar cada número em um `<Num>` próprio,
 * com o texto/glifo não-numérico fora dele, no lote que migrar aquele componente.
 */
export function Num({ value, format, decimals = 0, className = "" }: NumProps) {
  return (
    <span className={["font-serif tabular-nums", className].filter(Boolean).join(" ")}>
      {formatValue(value, format, decimals)}
    </span>
  );
}
