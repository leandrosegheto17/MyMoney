import { useId, useState } from "react";
import { formatCentsToBRL } from "../../lib/currency";

export interface BarChartItem {
  /** Sempre o 1º dia do mês (`YYYY-MM-DD`). */
  month: string;
  incomeCents: number;
  expenseCents: number;
}

export interface BarChartProps {
  items: BarChartItem[];
}

const MONTH_FORMATTER = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });

function formatMonth(monthDateOnly: string): string {
  const [year, month] = monthDateOnly.split("-").map(Number);
  const label = MONTH_FORMATTER.format(new Date(year, month - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

/**
 * BarChart (entradas x saídas) — UX-SPEC.md Seção 3.3/S-REP-01: agrupado por mês, "sem
 * lib externa" (mesmo padrão do `DonutChart`, SVG próprio). `items` vem de
 * `GET /rpc/get_income_expense_report` (BE-F2-10), que **só retorna mês com dado real**
 * — este componente nunca fabrica zero para mês ausente, só exibe a nota de janela
 * parcial quando `items.length < 6` (RF-F2-10 AC2, DIR-06: não duplicar a regra do
 * backend, só refletir o que ele já garante estruturalmente).
 */
export function BarChart({ items }: BarChartProps) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">Sem lançamentos suficientes para exibir o comparativo ainda.</p>;
  }

  const maxCents = Math.max(...items.flatMap((item) => [item.incomeCents, item.expenseCents]), 1);
  const chartHeight = 160;

  return (
    <div className="flex flex-col gap-3">
      {items.length < 6 && (
        <p className="text-sm text-neutral-500">Dados disponíveis a partir de {formatMonth(items[0].month)}.</p>
      )}

      <div
        role="img"
        aria-label={`Comparativo de entradas e saídas por mês: ${items
          .map((item) => `${formatMonth(item.month)} — entradas ${formatCentsToBRL(item.incomeCents)}, saídas ${formatCentsToBRL(item.expenseCents)}`)
          .join("; ")}`}
        className="flex items-end gap-4 overflow-x-auto pb-2"
        style={{ height: chartHeight + 40 }}
      >
        {items.map((item) => {
          const incomeHeight = (item.incomeCents / maxCents) * chartHeight;
          const expenseHeight = (item.expenseCents / maxCents) * chartHeight;
          return (
            <div key={item.month} className="flex shrink-0 flex-col items-center gap-1">
              <div className="flex items-end gap-1" style={{ height: chartHeight }}>
                <div
                  aria-hidden="true"
                  className="w-5 rounded-t-sm bg-income"
                  style={{ height: Math.max(2, incomeHeight) }}
                  title={`Entradas: ${formatCentsToBRL(item.incomeCents)}`}
                />
                <div
                  aria-hidden="true"
                  className="w-5 rounded-t-sm bg-expense"
                  style={{ height: Math.max(2, expenseHeight) }}
                  title={`Saídas: ${formatCentsToBRL(item.expenseCents)}`}
                />
              </div>
              <span className="text-xs font-medium text-neutral-600">{formatMonth(item.month)}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 text-xs text-neutral-600">
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="h-3 w-3 rounded-full bg-income" /> Entradas
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="h-3 w-3 rounded-full bg-expense" /> Saídas
        </span>
      </div>

      <button
        type="button"
        onClick={() => setShowTable((current) => !current)}
        aria-expanded={showTable}
        aria-controls={tableId}
        className="min-h-11 self-start text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {showTable ? "Ocultar tabela" : "Ver como tabela"}
      </button>

      {showTable && (
        <table id={tableId} className="w-full text-sm">
          <caption className="sr-only">Comparativo de entradas e saídas por mês, em formato de tabela</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left font-medium text-neutral-500">
                Mês
              </th>
              <th scope="col" className="text-right font-medium text-neutral-500">
                Entradas
              </th>
              <th scope="col" className="text-right font-medium text-neutral-500">
                Saídas
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.month}>
                <td>{formatMonth(item.month)}</td>
                <td className="text-right tabular-nums">{formatCentsToBRL(item.incomeCents)}</td>
                <td className="text-right tabular-nums">{formatCentsToBRL(item.expenseCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
