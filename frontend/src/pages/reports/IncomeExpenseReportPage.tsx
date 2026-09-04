import { useEffect, useState } from "react";
import { Alert, Card, Skeleton } from "../../components/base";
import { BarChart } from "../../components/domain/BarChart";
import { getIncomeExpenseReport } from "../../lib/api/reports";
import { ApiError } from "../../lib/api/errors";
import type { IncomeExpenseReportItem } from "../../lib/api/types";

/**
 * S-REP-01 (FE-F2-08) — UX-SPEC.md: gráfico de barras agrupadas, últimos 6 meses com
 * dado real. `BarChart` já trata "menos de 6 meses de dado" com a nota textual
 * (RF-F2-10 AC2) — esta página só passa adiante o que `get_income_expense_report`
 * retorna, nunca completa com zero (DIR-06).
 */
export function IncomeExpenseReportPage() {
  const [items, setItems] = useState<IncomeExpenseReportItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getIncomeExpenseReport()
      .then(setItems)
      .catch((cause) => setLoadError(cause instanceof ApiError ? cause.message : "Não foi possível carregar o relatório."));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">Entradas x Saídas</h1>

      {loadError && <Alert variant="danger">{loadError}</Alert>}
      {!items && !loadError && <Skeleton lines={4} aria-label="Carregando relatório" />}
      {items && (
        <Card>
          <BarChart items={items.map((item) => ({ month: item.month, incomeCents: item.income_cents, expenseCents: item.expense_cents }))} />
        </Card>
      )}
    </div>
  );
}
