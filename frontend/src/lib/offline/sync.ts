import { listPendingTransactions, markSyncError, markSyncing, removePendingTransaction } from "./queue";
import type { PendingTransaction } from "./db";
import { createTransaction } from "../api/transactions";
import { ApiError } from "../api/errors";
import type { NewTransaction } from "../api/types";

/**
 * Adapter de sincronização — assinatura estável que o resto do app (badge, hook,
 * disparo em `online`) consome. A implementação injetada troca sem tocar em quem
 * chama `syncPendingTransactions` (ex.: testes usam um client fake em memória).
 */
export type TransactionSyncClient = (transaction: PendingTransaction) => Promise<{ ok: true } | { ok: false; error: string }>;

/**
 * `PendingTransaction` (fila local, `db.ts`) → `NewTransaction` (`POST /transactions`,
 * `API-CONTRACT.yaml`). RN-16/DIR-36 (`ADR-016` Decisão 3, `FE-REF-04`): `account_id`
 * só é incluído no payload se o item enfileirado já carregava um (item antigo, de
 * antes desta mudança) — itens novos (enfileirados pelo formulário atual, que não
 * coleta mais conta) nunca têm `accountId`, e o servidor resolve `account_id` a
 * partir de `payment_method_id`, mesma regra já aplicada ao caminho online.
 */
export function toNewTransaction(pending: PendingTransaction): NewTransaction {
  return {
    kind: pending.type === "entrada" ? "income" : "expense",
    amount_cents: pending.amountCents,
    transaction_date: pending.date,
    payment_method_id: pending.paymentMethodId || undefined,
    // Categoria: subcategoria (2º nível) é a mais específica quando escolhida; category_id
    // do contrato aceita tanto categoria raiz quanto subcategoria (mesma tabela, self-reference).
    category_id: pending.subcategoryId || pending.categoryId || undefined,
    description: pending.description || undefined,
    source: "manual",
    ...(pending.accountId ? { account_id: pending.accountId } : {}),
  };
}

/**
 * Client real de sincronização — `FE-M-03` fechada: `BE-M-06` publicou `/transactions`
 * em `API-CONTRACT.yaml` v0.2.0+. Chama `POST /transactions` (PostgREST via
 * supabase-js) para cada item da fila; nunca remove o item localmente por conta
 * própria — quem chama (`syncPendingTransactions`) decide isso só após a Promise
 * resolver com `ok: true`, preservando DIR-11/RNF-04 (nenhum lançamento perdido).
 */
export const realSyncClient: TransactionSyncClient = async (transaction) => {
  try {
    await createTransaction(toNewTransaction(transaction));
    return { ok: true };
  } catch (error) {
    const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Erro desconhecido ao sincronizar";
    return { ok: false, error: message };
  }
};

export interface SyncResult {
  succeeded: string[];
  failed: Array<{ localId: string; error: string }>;
}

/**
 * Percorre a fila local (mais antigo primeiro) e tenta sincronizar cada item via
 * `syncClient` (por padrão, `realSyncClient` — `POST /transactions` real). Lançamento
 * só sai da fila (DIR-11) após confirmação explícita de sucesso do servidor — nunca
 * antes, nunca por otimismo.
 */
export async function syncPendingTransactions(syncClient: TransactionSyncClient = realSyncClient): Promise<SyncResult> {
  const pending = await listPendingTransactions();
  const result: SyncResult = { succeeded: [], failed: [] };

  for (const transaction of pending) {
    await markSyncing(transaction.localId);
    try {
      const response = await syncClient(transaction);
      if (response.ok) {
        await removePendingTransaction(transaction.localId);
        result.succeeded.push(transaction.localId);
      } else {
        await markSyncError(transaction.localId, response.error);
        result.failed.push({ localId: transaction.localId, error: response.error });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido ao sincronizar";
      await markSyncError(transaction.localId, message);
      result.failed.push({ localId: transaction.localId, error: message });
    }
  }

  return result;
}
