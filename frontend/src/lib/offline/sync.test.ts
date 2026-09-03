import { beforeEach, describe, expect, it, vi } from "vitest";
import { offlineDb } from "./db";
import { enqueueTransaction } from "./queue";

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

const createTransactionMock = vi.fn();
vi.mock("../api/transactions", () => ({
  createTransaction: (...args: unknown[]) => createTransactionMock(...args),
}));

const { syncPendingTransactions, toNewTransaction, realSyncClient } = await import("./sync");

beforeEach(async () => {
  await offlineDb.pendingTransactions.clear();
  createTransactionMock.mockReset();
});

describe("toNewTransaction (mapeamento fila local -> POST /transactions, API-CONTRACT.yaml)", () => {
  it("mapeia type 'saida'/'entrada' para kind 'expense'/'income' e usa subcategoria quando presente", () => {
    expect(toNewTransaction({ ...DRAFT, localId: "x", status: "pending", createdAt: 0, updatedAt: 0 })).toMatchObject({
      account_id: "acc-1",
      kind: "expense",
      amount_cents: 4500,
      transaction_date: "2026-09-02",
      payment_method_id: "pm-1",
      category_id: "cat-1",
      description: "Mercado",
      source: "manual",
    });

    expect(
      toNewTransaction({ ...DRAFT, subcategoryId: "subcat-1", type: "entrada", localId: "y", status: "pending", createdAt: 0, updatedAt: 0 }),
    ).toMatchObject({ kind: "income", category_id: "subcat-1" });
  });
});

describe("syncPendingTransactions — FE-M-03 fechada (BE-M-06 publicado em API-CONTRACT.yaml)", () => {
  it("usa o client real (POST /transactions) por padrão e remove o item da fila em sucesso", async () => {
    createTransactionMock.mockResolvedValue({ id: "txn-1" });
    const record = await enqueueTransaction(DRAFT);

    const result = await syncPendingTransactions();

    expect(result.succeeded).toEqual([record.localId]);
    expect(createTransactionMock).toHaveBeenCalledWith(expect.objectContaining({ account_id: "acc-1", kind: "expense" }));
    expect(await offlineDb.pendingTransactions.get(record.localId)).toBeUndefined();
  });

  it("mantém o item na fila com o erro do servidor quando o client real falha (ex.: 409 conta inativa)", async () => {
    createTransactionMock.mockRejectedValue(new Error("Conta inativa não aceita novos lançamentos"));
    const record = await enqueueTransaction(DRAFT);

    const result = await syncPendingTransactions();

    expect(result.failed).toEqual([{ localId: record.localId, error: "Conta inativa não aceita novos lançamentos" }]);
    const stillQueued = await offlineDb.pendingTransactions.get(record.localId);
    expect(stillQueued?.status).toBe("error");
  });

  it("realSyncClient nunca remove o item sozinho — só reporta ok/erro, quem decide é syncPendingTransactions", async () => {
    createTransactionMock.mockResolvedValue({ id: "txn-1" });
    const response = await realSyncClient({ ...DRAFT, localId: "z", status: "pending", createdAt: 0, updatedAt: 0 });
    expect(response).toEqual({ ok: true });
  });

  it("removes the item from the queue only after an injected client confirms success", async () => {
    const record = await enqueueTransaction(DRAFT);
    const result = await syncPendingTransactions(async () => ({ ok: true }));

    expect(result.succeeded).toEqual([record.localId]);
    expect(await offlineDb.pendingTransactions.get(record.localId)).toBeUndefined();
  });

  it("keeps the item in the queue with the error recorded when the injected client fails", async () => {
    const record = await enqueueTransaction(DRAFT);
    await syncPendingTransactions(async () => ({ ok: false, error: "rede indisponível" }));

    const stillQueued = await offlineDb.pendingTransactions.get(record.localId);
    expect(stillQueued?.status).toBe("error");
    expect(stillQueued?.lastError).toBe("rede indisponível");
  });

  it("syncs multiple queued transactions without losing any of them", async () => {
    const a = await enqueueTransaction({ ...DRAFT, description: "A" });
    const b = await enqueueTransaction({ ...DRAFT, description: "B" });

    const result = await syncPendingTransactions(async () => ({ ok: true }));

    expect(result.succeeded.sort()).toEqual([a.localId, b.localId].sort());
    expect(await offlineDb.pendingTransactions.count()).toBe(0);
  });
});
