import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient } from "./testSupabaseClient";

const fake = createFakeSupabaseClient();
vi.mock("../supabase/client", () => ({
  getSupabaseClient: () => fake.client,
}));

const { getTransactionShortcuts } = await import("./shortcuts");
const { ApiError } = await import("./errors");

describe("shortcuts API client — get_transaction_shortcuts (RF-REF-03, ADR-015 Decisão 1)", () => {
  beforeEach(() => {
    fake.calls.length = 0;
  });

  it("chama a RPC get_transaction_shortcuts sem argumentos e devolve as linhas na ordem recebida (DIR-34: nenhum reordenamento no client)", async () => {
    const rows = [
      { category_id: "cat-2", payment_method_id: "pm-2" },
      { category_id: "cat-1", payment_method_id: null },
    ];
    fake.queueResult({ data: rows, error: null, status: 200 });

    const result = await getTransactionShortcuts();

    expect(result).toEqual(rows);
    const rpcCall = fake.calls.find((call) => call.table === "get_transaction_shortcuts" && call.method === "rpc");
    expect(rpcCall?.args).toEqual([{}]);
  });

  it("histórico vazio: RPC devolve [] (AC2 — barra de atalhos é responsabilidade do consumidor omitir)", async () => {
    fake.queueResult({ data: [], error: null, status: 200 });
    await expect(getTransactionShortcuts()).resolves.toEqual([]);
  });

  it("erro do servidor vira ApiError (consumidor decide tratar como 'sem atalhos', UX-SPEC Seção 4.2)", async () => {
    fake.queueResult({ data: null, error: { message: "unexpected error", code: "XX000" }, status: 500 });
    await expect(getTransactionShortcuts()).rejects.toBeInstanceOf(ApiError);
  });
});
