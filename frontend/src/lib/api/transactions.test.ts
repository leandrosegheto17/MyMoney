import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient } from "./testSupabaseClient";

const fake = createFakeSupabaseClient();
vi.mock("../supabase/client", () => ({
  getSupabaseClient: () => fake.client,
}));

const { createTransaction, listTransactions, deleteTransaction } = await import("./transactions");
const { ApiError } = await import("./errors");

describe("transactions API client (BE-M-06, API-CONTRACT.yaml /transactions)", () => {
  beforeEach(() => {
    fake.calls.length = 0;
  });

  it("createTransaction: POST /transactions bem-sucedido retorna o lançamento criado com saldo já refletido (DIR-12)", async () => {
    const created = {
      id: "txn-1",
      user_id: "u1",
      account_id: "acc-1",
      destination_account_id: null,
      payment_method_id: "pm-1",
      category_id: "cat-1",
      kind: "expense",
      amount_cents: 4500,
      description: "Mercado",
      transaction_date: "2026-09-03",
      status: "cleared",
      source: "manual",
      created_at: "2026-09-03T10:00:00Z",
      updated_at: "2026-09-03T10:00:00Z",
    };
    fake.queueResult({ data: created, error: null, status: 201 });

    const result = await createTransaction({
      account_id: "acc-1",
      kind: "expense",
      amount_cents: 4500,
      transaction_date: "2026-09-03",
      payment_method_id: "pm-1",
      category_id: "cat-1",
      description: "Mercado",
    });

    expect(result).toEqual(created);
    expect(fake.client.from).toHaveBeenCalledWith("transactions");
  });

  it("createTransaction: 409 (conta inativa/CHECK) lança ApiError kind 'conflict', nada é assumido persistido", async () => {
    fake.queueResult({
      data: null,
      error: { message: "Conta inativa não aceita novos lançamentos", code: "23514" },
      status: 409,
    });

    await expect(
      createTransaction({ account_id: "acc-inactive", kind: "expense", amount_cents: 100, transaction_date: "2026-09-03" }),
    ).rejects.toMatchObject({ kind: "conflict" } satisfies Partial<InstanceType<typeof ApiError>>);
  });

  it("createTransaction: 400 (campo obrigatório ausente) lança ApiError kind 'validation'", async () => {
    fake.queueResult({ data: null, error: { message: "null value in column account_id" }, status: 400 });

    await expect(createTransaction({ account_id: "", kind: "expense", amount_cents: 0, transaction_date: "" })).rejects.toMatchObject({
      kind: "validation",
    });
  });

  it("listTransactions: sem filtro nenhum, lista o que o servidor retornar (mês corrente é decidido pelo servidor/RLS, RF-MVP-04 AC5)", async () => {
    fake.queueResult({ data: [], error: null, status: 200 });
    const result = await listTransactions();
    expect(result).toEqual([]);
  });

  it("deleteTransaction: sucesso não lança", async () => {
    fake.queueResult({ data: [{ id: "txn-1" }], error: null, status: 200 });
    await expect(deleteTransaction("txn-1")).resolves.toBeUndefined();
  });
});
