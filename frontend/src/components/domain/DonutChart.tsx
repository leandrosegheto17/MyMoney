import { useId, useState } from "react";
import { formatCentsToBRL } from "../../lib/currency";

export interface DonutChartSlice {
  id: string;
  label: string;
  valueCents: number;
}

export interface DonutChartProps {
  slices: DonutChartSlice[];
  /** UX-SPEC.md S-DASH-01: "tocar em uma fatia navega para a lista de lançamentos filtrada". */
  onSliceClick?: (id: string) => void;
}

const PALETTE = ["#2563EB", "#16A34A", "#D97706", "#DC2626", "#7C3AED", "#0891B2", "#DB2777", "#4B5563"];

/**
 * DonutChart — UX-SPEC.md Seção 3.3: "Gráfico + legenda tocável, navega para lista
 * filtrada" (S-DASH-01, RF-MVP-06). WCAG (Seção 5, "Alternativa a gráficos"): sempre
 * acompanhado de resumo textual equivalente — toggle "Ver como tabela" expõe os
 * mesmos dados numa `<table>` para quem não interpreta o SVG.
 */
export function DonutChart({ slices, onSliceClick }: DonutChartProps) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();
  const total = slices.reduce((sum, slice) => sum + slice.valueCents, 0);

  if (total === 0 || slices.length === 0) {
    return <p className="text-sm text-neutral-500">Sem dados para exibir no período.</p>;
  }

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  // Offset acumulado de cada fatia, calculado antes do render (não mutado durante-o) —
  // evita reatribuir uma variável dentro do corpo do JSX.
  const offsets: number[] = [];
  slices.reduce((acc, slice) => {
    offsets.push(acc);
    return acc + (slice.valueCents / total) * circumference;
  }, 0);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <svg
        viewBox="0 0 100 100"
        width={160}
        height={160}
        role="img"
        aria-label={`Distribuição por categoria: ${slices.map((s) => `${s.label} ${Math.round((s.valueCents / total) * 100)}%`).join(", ")}`}
        className="shrink-0"
      >
        {slices.map((slice, index) => {
          const pct = slice.valueCents / total;
          const dash = pct * circumference;
          const strokeDasharray = `${dash} ${circumference - dash}`;
          const strokeDashoffset = -offsets[index];
          const color = PALETTE[index % PALETTE.length];
          return (
            <circle
              key={slice.id}
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth="18"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 50 50)"
              className={onSliceClick ? "cursor-pointer" : undefined}
              onClick={() => onSliceClick?.(slice.id)}
            />
          );
        })}
      </svg>

      <div className="flex-1">
        <ul className="flex flex-col gap-2">
          {slices.map((slice, index) => {
            const pct = Math.round((slice.valueCents / total) * 100);
            const color = PALETTE[index % PALETTE.length];
            return (
              <li key={slice.id}>
                <button
                  type="button"
                  onClick={() => onSliceClick?.(slice.id)}
                  className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="flex-1 text-neutral-700">{slice.label}</span>
                  <span className="font-medium text-neutral-900">
                    {formatCentsToBRL(slice.valueCents)} ({pct}%)
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => setShowTable((current) => !current)}
          aria-expanded={showTable}
          aria-controls={tableId}
          className="mt-2 min-h-11 text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {showTable ? "Ocultar tabela" : "Ver como tabela"}
        </button>

        {showTable && (
          <table id={tableId} className="mt-2 w-full text-sm">
            <caption className="sr-only">Distribuição por categoria, em formato de tabela</caption>
            <thead>
              <tr>
                <th scope="col" className="text-left font-medium text-neutral-500">
                  Categoria
                </th>
                <th scope="col" className="text-right font-medium text-neutral-500">
                  Valor
                </th>
                <th scope="col" className="text-right font-medium text-neutral-500">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {slices.map((slice) => (
                <tr key={slice.id}>
                  <td>{slice.label}</td>
                  <td className="text-right tabular-nums">{formatCentsToBRL(slice.valueCents)}</td>
                  <td className="text-right tabular-nums">{Math.round((slice.valueCents / total) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
