import { useId, useState } from "react";
import { formatCentsToBRL } from "../../lib/currency";

export interface LineChartItem {
  /** Sempre o 1º dia do mês (`YYYY-MM-DD`). */
  month: string;
  balanceCents: number;
}

export interface LineChartProps {
  items: LineChartItem[];
}

const MONTH_FORMATTER = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });

function formatMonth(monthDateOnly: string): string {
  const [year, month] = monthDateOnly.split("-").map(Number);
  const label = MONTH_FORMATTER.format(new Date(year, month - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

/**
 * LineChart (evolução patrimonial) — UX-SPEC.md Seção 3.3/S-REP-02: série temporal do
 * saldo consolidado (ou de 1 conta filtrada), "sem lib externa" (mesmo padrão de
 * `BarChart`/`DonutChart`, SVG próprio). `items` vem de `POST /rpc/get_net_worth_evolution`
 * (BE-F3-06), que **só retorna mês real dentro da janela de até 6 meses** — este
 * componente nunca fabrica ponto para mês ausente, só exibe a nota de janela parcial
 * quando `items.length < 6` (mesmo tratamento de `BarChart`/RF-F2-10 AC2, DIR-06).
 */
export function LineChart({ items }: LineChartProps) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">Sem dados suficientes para exibir a evolução patrimonial ainda.</p>;
  }

  const chartWidth = 480;
  const chartHeight = 160;
  const balances = items.map((item) => item.balanceCents);
  const maxBalance = Math.max(...balances, 0);
  const minBalance = Math.min(...balances, 0);
  const range = maxBalance - minBalance || 1;

  const points = items.map((item, index) => {
    const x = items.length === 1 ? chartWidth / 2 : (index / (items.length - 1)) * chartWidth;
    const y = chartHeight - ((item.balanceCents - minBalance) / range) * chartHeight;
    return { x, y, item };
  });

  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="flex flex-col gap-3">
      {items.length < 6 && (
        <p className="text-sm text-neutral-500">Dados disponíveis a partir de {formatMonth(items[0].month)}.</p>
      )}

      <div
        role="img"
        aria-label={`Evolução do saldo consolidado por mês: ${items
          .map((item) => `${formatMonth(item.month)} — ${formatCentsToBRL(item.balanceCents)}`)
          .join("; ")}`}
        className="overflow-x-auto pb-2"
      >
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          width={chartWidth}
          height={chartHeight}
          preserveAspectRatio="none"
          className="min-w-full"
          aria-hidden="true"
        >
          <polyline points={polylinePoints} fill="none" stroke="#2563EB" strokeWidth="2" />
          {points.map((point) => (
            <circle key={point.item.month} cx={point.x} cy={point.y} r={3} fill="#2563EB">
              <title>{`${formatMonth(point.item.month)}: ${formatCentsToBRL(point.item.balanceCents)}`}</title>
            </circle>
          ))}
        </svg>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto text-xs text-neutral-600">
        {items.map((item) => (
          <span key={item.month} className="shrink-0 font-medium">
            {formatMonth(item.month)}
          </span>
        ))}
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
          <caption className="sr-only">Evolução do saldo consolidado por mês, em formato de tabela</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left font-medium text-neutral-500">
                Mês
              </th>
              <th scope="col" className="text-right font-medium text-neutral-500">
                Saldo
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.month}>
                <td>{formatMonth(item.month)}</td>
                <td className="text-right tabular-nums">{formatCentsToBRL(item.balanceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
