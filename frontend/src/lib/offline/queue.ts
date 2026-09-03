import { offlineDb } from "./db";
import type { PendingTransaction } from "./db";

export type NewPendingTransaction = Omit<PendingTransaction, "localId" | "status" | "createdAt" | "updatedAt" | "lastError">;

function generateLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback só para ambientes sem `crypto.randomUUID` (ex.: navegador muito antigo) —
  // suficiente como chave local, nunca exposta como id definitivo do lançamento.
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Enfileira um lançamento manual digitado offline — DIR-11/RNF-04. Chamado pelo
 * formulário de lançamento (S-TXN-02, `FE-M-09`) quando a chamada de rede à API real
 * falha ou o navegador já está offline no momento do submit.
 */
export async function enqueueTransaction(draft: NewPendingTransaction): Promise<PendingTransaction> {
  const now = Date.now();
  const record: PendingTransaction = {
    ...draft,
    localId: generateLocalId(),
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  await offlineDb.pendingTransactions.add(record);
  return record;
}

/** Lista os lançamentos ainda não sincronizados, mais antigos primeiro (ordem de tentativa). */
export async function listPendingTransactions(): Promise<PendingTransaction[]> {
  return offlineDb.pendingTransactions.where("status").anyOf("pending", "error").sortBy("createdAt");
}

/** Contagem de itens pendentes — usado pelo `OfflineSyncBadge`. */
export async function countPendingTransactions(): Promise<number> {
  return offlineDb.pendingTransactions.where("status").anyOf("pending", "error").count();
}

export async function markSyncing(localId: string): Promise<void> {
  await offlineDb.pendingTransactions.update(localId, { status: "syncing", updatedAt: Date.now() });
}

export async function markSyncError(localId: string, message: string): Promise<void> {
  await offlineDb.pendingTransactions.update(localId, { status: "error", lastError: message, updatedAt: Date.now() });
}

/** Remove o item da fila após confirmação de que o servidor persistiu o lançamento com sucesso — nunca antes disso (sem perda, DIR-11/RNF-04). */
export async function removePendingTransaction(localId: string): Promise<void> {
  await offlineDb.pendingTransactions.delete(localId);
}
