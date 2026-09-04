import Dexie from "dexie";
import type { Table } from "dexie";

export type PendingTransactionStatus = "pending" | "syncing" | "error";

/**
 * Rascunho de lançamento manual enfileirado offline — DIR-11 (TASK.md Seção 1.3):
 * "Fila de lançamentos offline via IndexedDB usando Dexie.js — nenhuma outra solução
 * de storage local para essa fila (não LocalStorage)".
 *
 * Formato de campos alinhado ao formulário S-TXN-02 (UX-SPEC Seção 2.2) — o mesmo
 * conjunto de campos que `BE-M-06` (CRUD de lançamentos manuais) vai exigir quando o
 * contrato de API real for publicado (ver `syncPendingTransactions`, `sync.ts`).
 */
export interface PendingTransaction {
  /** Chave local (uuid), nunca reaproveitada como id definitivo do lançamento — o servidor gera o id real na confirmação. */
  localId: string;
  /**
   * Opcional desde `FE-REF-04` (RN-16/DIR-36, `ADR-016` Decisão 3): `S-TXN-02` não
   * coleta mais conta — o servidor resolve `account_id` a partir de
   * `paymentMethodId` na sincronização real (`sync.ts`, `toNewTransaction`), mesma
   * regra do caminho online. Mantido no schema (não removido) só por compatibilidade
   * com item já enfileirado localmente antes desta mudança (IndexedDB do dispositivo
   * do usuário, fora do controle desta migration de código).
   */
  accountId?: string;
  paymentMethodId: string;
  categoryId: string;
  subcategoryId: string | null;
  /** Valor em centavos (inteiro) — mesma convenção de `src/lib/currency.ts`. */
  amountCents: number;
  type: "entrada" | "saida";
  description: string;
  /** Data no formato `YYYY-MM-DD` (mesmo formato do `<input type="date">` nativo do `DatePicker`). */
  date: string;
  status: PendingTransactionStatus;
  /** Mensagem do último erro de sincronização, se `status === "error"`. */
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

class MyMoneyOfflineDb extends Dexie {
  pendingTransactions!: Table<PendingTransaction, string>;

  constructor() {
    super("mymoney-offline");
    this.version(1).stores({
      // `localId` como chave primária; índices em `status`/`createdAt` para consultas
      // do `OfflineSyncBadge` (contagem de pendentes) e do worker de sincronização
      // (ordem de tentativa: mais antigo primeiro).
      pendingTransactions: "localId, status, createdAt",
    });
  }
}

export const offlineDb = new MyMoneyOfflineDb();
