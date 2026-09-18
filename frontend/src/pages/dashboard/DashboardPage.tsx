import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Badge, Card, EmptyState, Skeleton } from "../../components/base";
import { Num } from "../../components/base/Num";
import { DonutChart } from "../../components/domain/DonutChart";
import { ProgressBar } from "../../components/domain/ProgressBar";
import { getMonthlyCategorySummary, getMonthProvision, getMonthTransactionCount } from "../../lib/api/dashboard";
import { getBudgetStatus } from "../../lib/api/budget";
import { listTransactions } from "../../lib/api/transactions";
import { ApiError } from "../../lib/api/errors";
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
          {/*
           * `UX-SPEC.md` Seção 2.2 ("`S-DASH-01` revisado para desktop"): a partir de
           * `lg` (1024px), Linha 1 é um grid de 2 colunas — esquerda (saldo hero + 3
           * KPIs, ~col-span-3) e direita (donut+legenda, ~col-span-2) lado a lado.
           * Linha 2, logo abaixo, é um 2º grid de 2 colunas ocupando a largura toda —
           * "Orçamentos do mês (resumo)" e "Últimos lançamentos" lado a lado (2º ganho
           * de altura de rolagem exigido por RF-REF-01 AC3). Abaixo de `lg`, ambos os
           * grids colapsam para 1 coluna; a ordem no DOM (preservada abaixo, nunca
           * reordenada por `order`/JS) corresponde exatamente à sequência mobile de
           * `DashboardMobile.dc.html`/wireframe base (saldo → 3 KPIs → donut →
           * orçamentos → últimos lançamentos), RNF-10.
           */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="flex flex-col gap-4 lg:col-span-3">
              <Card elevation="md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Saldo consolidado</p>
                    <p className="text-4xl font-medium text-neutral-900">
                      <Num value={data.totalBalanceCents} format="currency" />
                    </p>
                  </div>
                  <Badge tone="primary" icon={<span>●</span>}>
                    sincronizado agora
                  </Badge>
                </div>
              </Card>

              <Card>
                <div className="grid grid-cols-3 gap-2 text-center sm:gap-4">
                  <div>
                    <p className="text-xs text-neutral-500">Entradas do mês</p>
                    <p className="font-semibold text-income">
                      <span aria-hidden="true">↑ </span>
                      <Num value={data.incomeCents} format="currency" />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Saídas do mês</p>
                    <p className="font-semibold text-expense">
                      <span aria-hidden="true">↓ </span>
                      <Num value={data.expenseCents} format="currency" />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Lançamentos</p>
                    <p className="font-semibold text-neutral-800">
                      <Num value={data.transactionCount} format="count" /> este mês
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="flex flex-col gap-4 lg:col-span-2">
              <Card>
                <h2 className="mb-3 text-base font-medium text-neutral-800">Para onde o dinheiro foi (este mês)</h2>
                {expenseSlices.length === 0 ? (
                  <EmptyState title="Nenhum lançamento este mês ainda" />
                ) : (
                  <DonutChart slices={expenseSlices} onSliceClick={(categoryId) => navigate(`/lancamentos?categoria=${categoryId}`)} />
                )}
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                        <span aria-hidden="true">{transaction.kind === "income" ? "↑" : "↓"} </span>
                        <Num value={transaction.amount_cents} format="currency" />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
