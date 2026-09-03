import { useEffect, useState, useCallback } from "react";
import { liveQuery } from "dexie";
import { offlineDb } from "./db";
import type { PendingTransaction } from "./db";
import { syncPendingTransactions } from "./sync";
import type { TransactionSyncClient } from "./sync";

export interface OfflineQueueState {
  pendingItems: PendingTransaction[];
  pendingCount: number;
  isSyncing: boolean;
  isOnline: boolean;
  /** Dispara uma tentativa de sincronização manual (ex.: usuário toca "Tentar agora" no detalhe do badge). */
  syncNow: () => Promise<void>;
}

/**
 * Hook de estado da fila offline (FE-M-03). `OfflineSyncBadge` (e qualquer outro
 * ponto do app, ex. formulário de lançamento) consomem este hook em vez de acessar
 * o Dexie diretamente — `liveQuery` mantém a contagem/lista reativa a qualquer
 * escrita na fila, sem exigir que o chamador faça polling manual.
 */
export function useOfflineQueue(syncClient?: TransactionSyncClient): OfflineQueueState {
  const [pendingItems, setPendingItems] = useState<PendingTransaction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const subscription = liveQuery(() =>
      offlineDb.pendingTransactions.where("status").anyOf("pending", "error").sortBy("createdAt"),
    ).subscribe({
      next: setPendingItems,
      error: (error) => console.error("useOfflineQueue: falha ao observar a fila offline", error),
    });
    return () => subscription.unsubscribe();
  }, []);

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncPendingTransactions(syncClient);
    } finally {
      setIsSyncing(false);
    }
  }, [syncClient]);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      // RNF-04/DIR-11: sincroniza automaticamente ao reconectar, sem exigir ação do usuário.
      void syncNow();
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncNow]);

  return {
    pendingItems,
    pendingCount: pendingItems.length,
    isSyncing,
    isOnline,
    syncNow,
  };
}
