import { beforeEach, describe, expect, it } from "vitest";
import { offlineDb } from "./db";
import { countPendingTransactions, enqueueTransaction, listPendingTransactions, removePendingTransaction } from "./queue";

const DRAFT = {
  accountId: "acc-1",
  paymentMethodId: "pm-1",
  categoryId: "cat-1",
  subcategoryId: null,
  amountCents: 4500,
  type: "saida" as const,
  description: "Mercado",
  date: "2026-09-02",
};

beforeEach(async () => {
  await offlineDb.pendingTransactions.clear();
});

describe("offline queue (Dexie/IndexedDB — DIR-11)", () => {
  it("enqueues a transaction typed offline with status pending", async () => {
    const record = await enqueueTransaction(DRAFT);
    expect(record.status).toBe("pending");
    expect(record.localId).toBeTruthy();

    const stored = await offlineDb.pendingTransactions.get(record.localId);
    expect(stored?.description).toBe("Mercado");
  });

  it("lists pending transactions ordered oldest first, without losing any item", async () => {
    const first = await enqueueTransaction({ ...DRAFT, description: "Primeiro" });
    const second = await enqueueTransaction({ ...DRAFT, description: "Segundo" });

    const pending = await listPendingTransactions();
    expect(pending.map((t) => t.localId)).toEqual([first.localId, second.localId]);
  });

  it("counts pending items for the OfflineSyncBadge", async () => {
    await enqueueTransaction(DRAFT);
    await enqueueTransaction(DRAFT);
    expect(await countPendingTransactions()).toBe(2);
  });

  it("removes an item only after being told to (simulating post-sync confirmation)", async () => {
    const record = await enqueueTransaction(DRAFT);
    await removePendingTransaction(record.localId);
    expect(await countPendingTransactions()).toBe(0);
  });
});
