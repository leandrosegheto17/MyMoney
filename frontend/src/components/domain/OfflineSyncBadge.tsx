import { useId, useState } from "react";
import { useOfflineQueue } from "../../lib/offline/useOfflineQueue";
import type { TransactionSyncClient } from "../../lib/offline/sync";
import { Modal } from "../base/Modal";
import { Button } from "../base/Button";
import { formatCentsToBRL } from "../../lib/currency";

export interface OfflineSyncBadgeProps {
  /** Injeção de teste/composição — em produção, o adapter real de `BE-M-06` quando publicado; por padrão usa o stub de `sync.ts`. */
  syncClient?: TransactionSyncClient;
}

/**
 * OfflineSyncBadge — UX-SPEC.md Seção 3.3: "Indicador de lançamentos na fila offline
 * (IndexedDB) ainda não sincronizados, com detalhe ao tocar" — presente no topo de
 * toda tela autenticada (RNF-04).
 *
 * `FE-M-03` fechada: por padrão sincroniza contra `realSyncClient` (`sync.ts`),
 * `POST /transactions` real (`BE-M-06`, `API-CONTRACT.yaml`). `syncClient` continua
 * injetável para composição/teste.
 */
export function OfflineSyncBadge({ syncClient }: OfflineSyncBadgeProps) {
  const { pendingItems, pendingCount, isSyncing, isOnline, syncNow } = useOfflineQueue(syncClient);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const labelId = useId();

  if (pendingCount === 0) {
    return (
      <span id={labelId} className="text-xs text-neutral-400">
        <span aria-hidden="true">●</span> Tudo sincronizado
      </span>
    );
  }

  const statusText = isOnline
    ? `${pendingCount} ${pendingCount === 1 ? "lançamento" : "lançamentos"} aguardando sincronização`
    : `${pendingCount} ${pendingCount === 1 ? "lançamento" : "lançamentos"} salvos offline`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDetailOpen(true)}
        aria-describedby={labelId}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-warning hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span aria-hidden="true">⏳</span>
        <span id={labelId}>{statusText}</span>
      </button>

      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Lançamentos aguardando sincronização"
        footer={
          <Button onClick={() => void syncNow()} loading={isSyncing} loadingLabel="Sincronizando" disabled={!isOnline}>
            Tentar sincronizar agora
          </Button>
        }
      >
        {!isOnline && (
          <p className="mb-3 text-sm text-neutral-600">
            Sem conexão no momento — os lançamentos abaixo estão salvos neste dispositivo e serão enviados
            automaticamente assim que a conexão voltar.
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {pendingItems.map((item) => (
            <li key={item.localId} className="flex items-center justify-between rounded-md border border-neutral-200 p-3 text-sm">
              <div>
                <p className="font-medium text-neutral-800">{item.description || "(sem descrição)"}</p>
                <p className="text-neutral-500">{item.date}</p>
                {item.status === "error" && item.lastError && (
                  <p className="mt-1 text-danger">{item.lastError}</p>
                )}
              </div>
              <span className={item.type === "entrada" ? "text-income" : "text-expense"}>
                {item.type === "entrada" ? "↑" : "↓"} {formatCentsToBRL(item.amountCents)}
              </span>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
