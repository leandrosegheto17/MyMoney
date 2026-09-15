import { useEffect, useState } from "react";
import { Alert, Card, Select, Skeleton } from "../../components/base";
import { LineChart } from "../../components/domain/LineChart";
import { getNetWorthEvolution } from "../../lib/api/reports";
import { listAccounts } from "../../lib/api/accounts";
import { ApiError } from "../../lib/api/errors";
import type { Account, NetWorthEvolutionItem } from "../../lib/api/types";

const ALL_ACCOUNTS_VALUE = "";

/**
 * S-REP-02 (FE-F3-07) — UX-SPEC.md Seção 2.2 (tabela "Relatórios e Exportação"):
 * gráfico de linha da série temporal do saldo consolidado, com filtro por conta
 * (select, incluindo "Todas as contas", RF-F3-05 AC1-2). `LineChart` já trata
 * "menos de 6 meses de dado" com a nota textual (mesmo tratamento de `BarChart`/
 * S-REP-01) — esta página só passa adiante o que `get_net_worth_evolution` retorna,
 * nunca completa com zero (DIR-06).
 */
export function NetWorthEvolutionReportPage() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(ALL_ACCOUNTS_VALUE);
  const [items, setItems] = useState<NetWorthEvolutionItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    listAccounts({ onlyActive: true })
      .then(setAccounts)
      .catch((cause) => setLoadError(cause instanceof ApiError ? cause.message : "Não foi possível carregar as contas."));
  }, []);

  useEffect(() => {
    setItems(null);
    getNetWorthEvolution(selectedAccountId === ALL_ACCOUNTS_VALUE ? undefined : selectedAccountId)
      .then(setItems)
      .catch((cause) => setLoadError(cause instanceof ApiError ? cause.message : "Não foi possível carregar o relatório."));
  }, [selectedAccountId]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">Evolução Patrimonial</h1>

      {loadError && <Alert variant="danger">{loadError}</Alert>}

      {accounts && (
        <Select
          label="Conta"
          value={selectedAccountId}
          onChange={(event) => setSelectedAccountId(event.target.value)}
          options={[
            { value: ALL_ACCOUNTS_VALUE, label: "Todas as contas" },
            ...accounts.map((account) => ({ value: account.id, label: account.name })),
          ]}
        />
      )}

      {!items && !loadError && <Skeleton lines={4} aria-label="Carregando relatório" />}
      {items && (
        <Card>
          <LineChart items={items.map((item) => ({ month: item.month, balanceCents: item.balance_cents }))} />
        </Card>
      )}
    </div>
  );
}
