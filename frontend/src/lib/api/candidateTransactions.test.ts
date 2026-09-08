import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient } from "./testSupabaseClient";

const fake = createFakeSupabaseClient();
vi.mock("../supabase/client", () => ({
  getSupabaseClient: () => fake.client,
}));

const { createCandidateTransaction, deleteCandidateTransaction, confirmCandidateTransaction } = await import(
  "./candidateTransactions"
);
const { ApiError } = await import("./errors");

describe("candidateTransactions API client — BE-F3-00 (RNF-01/RNF-08, DIR-20), consumido por DraftReviewBanner (FE-F3-04)", () => {
  beforeEach(() => {
    fake.calls.length = 0;
    fake.setAuthUser({ id: "test-user-id" });
  });

  describe("createCandidateTransaction", () => {
    it("insere com user_id explícito da sessão ativa (Bloqueio 015/SEC-DEBT-008) e source correto", async () => {
      fake.queueResult({ data: { id: "cand-1", status: "pending" }, error: null, status: 201 });
      fake.setAuthUser({ id: "user-abc" });

      await createCandidateTransaction({ source: "audio", raw_payload: { amount_cents: { value: 4500, confidence: 0.9 } } });

      const insertCall = fake.calls.find((call) => call.table === "candidate_transaction" && call.method === "insert");
      expect(insertCall?.args[0]).toMatchObject({ source: "audio", user_id: "user-abc" });
    });

    it("sessão inválida lança ApiError kind 'forbidden' antes de qualquer INSERT", async () => {
      fake.setAuthUser(null);

      await expect(createCandidateTransaction({ source: "ocr" })).rejects.toMatchObject({
        kind: "forbidden",
      } satisfies Partial<InstanceType<typeof ApiError>>);
      expect(fake.calls.some((call) => call.method === "insert")).toBe(false);
    });

    it("403 da policy de INSERT (ex. tentativa de 'fingir' confirmação) propaga como ApiError kind 'forbidden'", async () => {
      fake.queueResult({ data: null, error: { message: "new row violates row-level security policy" }, status: 403 });

      await expect(createCandidateTransaction({ source: "ocr" })).rejects.toMatchObject({ kind: "forbidden" });
    });
  });

  describe("deleteCandidateTransaction", () => {
    it("chama DELETE filtrando por id (RF-F3-01 AC4 — cancelar rascunho ainda pending)", async () => {
      fake.queueResult({ data: [{ id: "cand-1" }], error: null, status: 200 });

      await deleteCandidateTransaction("cand-1");

      const deleteCall = fake.calls.find((call) => call.table === "candidate_transaction" && call.method === "delete");
      const eqCall = fake.calls.find((call) => call.table === "candidate_transaction" && call.method === "eq");
      expect(deleteCall).toBeDefined();
      expect(eqCall?.args).toEqual(["id", "cand-1"]);
    });

    it("candidato já não-pending (404, policy de DELETE não afeta a linha) propaga como ApiError kind 'forbidden'", async () => {
      fake.queueResult({ data: null, error: { message: "not found" }, status: 404 });

      await expect(deleteCandidateTransaction("cand-1")).rejects.toMatchObject({ kind: "forbidden" });
    });
  });

  describe("confirmCandidateTransaction", () => {
    const params = {
      p_candidate_id: "cand-1",
      p_account_id: "acc-1",
      p_payment_method_id: "pm-1",
      p_category_id: "cat-1",
      p_kind: "expense" as const,
      p_amount_cents: 4500,
      p_transaction_date: "2026-09-07",
      p_description: "Mercado",
    };

    it("chama a RPC confirm_candidate_transaction com os parâmetros finais e retorna o id da Transaction criada", async () => {
      fake.queueResult({ data: "txn-1", error: null, status: 200 });

      const transactionId = await confirmCandidateTransaction(params);

      expect(transactionId).toBe("txn-1");
      const rpcCall = fake.calls.find((call) => call.table === "confirm_candidate_transaction" && call.method === "rpc");
      expect(rpcCall?.args[0]).toEqual(params);
    });

    it("candidato de outro usuário (403) propaga como ApiError kind 'forbidden'", async () => {
      fake.queueResult({ data: null, error: { message: "does not belong to the authenticated user", code: "42501" }, status: 403 });

      await expect(confirmCandidateTransaction(params)).rejects.toMatchObject({ kind: "forbidden" });
    });

    it("candidato já confirmado/descartado (409) propaga como ApiError kind 'conflict'", async () => {
      fake.queueResult({ data: null, error: { message: "is not pending", code: "23001" }, status: 409 });

      await expect(confirmCandidateTransaction(params)).rejects.toMatchObject({ kind: "conflict" });
    });
  });
});
