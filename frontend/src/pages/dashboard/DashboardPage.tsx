import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Badge, Card, EmptyState, Skeleton } from "../../components/base";
import { DonutChart } from "../../components/domain/DonutChart";
import { ProgressBar } from "../../components/domain/ProgressBar";
import { getMonthlyCategorySummary, getMonthProvision, getMonthTransactionCount } from "../../lib/api/dashboard";
import { getBudgetStatus } from "../../lib/api/budget";
import { listTransactions } from "../../lib/api/transactions";
import { ApiError } from "../../lib/api/errors";
import { formatCentsToBRL } from "../../lib/currency";
import type { BudgetStatusItem, MonthlyCategorySummaryItem, Transaction } from "../../lib/api/types";

interface DashboardData {
  totalBalanceCents: number;
  incomeCents: number;
  expenseCents: number;
  transactionCount: number;
  categorySummary: MonthlyCategorySummaryItem[];
  budgets: BudgetStatusItem[];
  recentTransactions: Transaction[];
}

/**
 * S-DASH-01 — UX-SPEC.md Seção 2.2: saldo consolidado, resumo do mês, gráfico de
 * distribuição por categoria como 2º bloco visível (não anexo secundário),
 * orçamentos do mês (resumo) e últimos lançamentos.
 */
export function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [provision, categorySummary, transactionCount, budgets, recentTransactions] = await Promise.all([
        getMonthProvision(),
        getMonthlyCategorySummary(),
        getMonthTransactionCount(),
        getBudgetStatus(),
        listTransactions({}),
      ]);
      // `current_total_balance_cents` já soma entradas/saídas do mês — deriva os cards
      // "Entradas do mês"/"Saídas do mês" (RF-MVP-06 AC1) diretamente da distribuição
      // por categoria, que já separa por `kind` (mesma fonte que o gráfico usa, sem
      // duplicar lógica de agregação no client).
      const incomeCents = categorySummary.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.total_cents, 0);
      const expenseCents = categorySummary.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.total_cents, 0);

      setData({
        totalBalanceCents: provision.current_total_balance_cents,
        incomeCents,
        expenseCents,
        transactionCount,
        categorySummary,
        budgets,
        recentTransactions: recentTransactions.slice(0, 5),
      });
      setLastUpdatedAt(new Date());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Não foi possível atualizar os dados.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const expenseSlices = (data?.categorySummary ?? [])
    .filter((item) => item.kind === "expense")
    .map((item) => ({ id: item.category_id, label: item.category_name, valueCents: item.total_cents }));

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Alert variant="danger">
          {error}
          {lastUpdatedAt && ` Últimos valores conhecidos, atualizados há pouco (${lastUpdatedAt.toLocaleTimeString("pt-BR")}).`}
        </Alert>
      )}

      {!data && !error && (
        <div className="flex flex-col gap-4">
          <Skeleton lines={2} aria-label="Carregando saldo" />
          <Skeleton lines={3} aria-label="Carregando resumo do mês" />
          <Skeleton lines={4} aria-label="Carregando gráfico" />
        </div>
      )}

      {data && (
        <>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500">Saldo consolidado</p>
                <p className="text-3xl font-semibold tabular-nums text-neutral-900">{formatCentsToBRL(data.totalBalanceCents)}</p>
              </div>
              <Badge tone="neutral" icon={<span>●</span>}>
                sincronizado agora
              </Badge>
            </div>
          </Card>

          <Card>
            <div className="grid grid-cols-1 gap-3 text-left sm:grid-cols-3 sm:gap-4 sm:text-center">
              <div>
                <p className="text-xs text-neutral-500">Entradas do mês</p>
                <p className="font-semibold text-income">↑ {formatCentsToBRL(data.incomeCents)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Saídas do mês</p>
                <p className="font-semibold text-expense">↓ {formatCentsToBRL(data.expenseCents)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Lançamentos</p>
                <p className="font-semibold text-neutral-800">{data.transactionCount} este mês</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-base font-medium text-neutral-800">Para onde o dinheiro foi (este mês)</h2>
            {expenseSlices.length === 0 ? (
              <EmptyState title="Nenhum lançamento este mês ainda" />
            ) : (
              <DonutChart slices={expenseSlices} onSliceClick={(categoryId) => navigate(`/lancamentos?categoria=${categoryId}`)} />
            )}
          </Card>

          {data.budgets.length > 0 && (
            <Card>
              <h2 className="mb-3 text-base font-medium text-neutral-800">Orçamentos do mês</h2>
              <div className="flex flex-col gap-3">
                {data.budgets.map((budget) => (
                  <ProgressBar key={budget.budget_id} label={budget.category_name} pctSpent={budget.pct_spent} alertLevel={budget.alert_level} />
                ))}
              </div>
            </Card>
          )}

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-medium text-neutral-800">Últimos lançamentos</h2>
              <button
                type="button"
                onClick={() => navigate("/lancamentos")}
                className="min-h-11 text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
              >
                ver todos
              </button>
            </div>
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-neutral-500">Nenhum lançamento ainda.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.recentTransactions.map((transaction) => (
                  <li key={transaction.id} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700">{transaction.description || "(sem descrição)"}</span>
                    <span className={transaction.kind === "income" ? "text-income" : "text-expense"}>
                      {transaction.kind === "income" ? "↑" : "↓"} {formatCentsToBRL(transaction.amount_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
