import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient } from "./testSupabaseClient";

const fake = createFakeSupabaseClient();
vi.mock("../supabase/client", () => ({
  getSupabaseClient: () => fake.client,
}));

const { createFixedBill } = await import("./fixedBills");
const { ApiError } = await import("./errors");

describe("fixedBills API client — user_id explícito no INSERT (Bloqueio 015, SEC-DEBT-008, defesa em profundidade)", () => {
  beforeEach(() => {
    fake.calls.length = 0;
    fake.setAuthUser({ id: "test-user-id" });
  });

  it("createFixedBill: inclui user_id da sessão ativa no payload do INSERT", async () => {
    fake.queueResult({ data: { id: "fixed-1" }, error: null, status: 201 });
    fake.setAuthUser({ id: "user-abc" });

    await createFixedBill({
      description: "Aluguel",
      amount_cents: 150000,
      category_id: "cat-1",
      account_id: "acc-1",
      payment_method_id: "pm-1",
      due_day: 5,
      start_date: "2026-09-01",
    });

    const insertCall = fake.calls.find((call) => call.table === "fixed_bills" && call.method === "insert");
    expect(insertCall?.args[0]).toMatchObject({ description: "Aluguel", user_id: "user-abc" });
  });

  it("createFixedBill: sessão inválida lança ApiError kind 'forbidden' antes de qualquer INSERT", async () => {
    fake.setAuthUser(null);

    await expect(
      createFixedBill({
        description: "Aluguel",
        amount_cents: 150000,
        category_id: "cat-1",
        account_id: "acc-1",
        payment_method_id: "pm-1",
        due_day: 5,
        start_date: "2026-09-01",
      }),
    ).rejects.toMatchObject({ kind: "forbidden" } satisfies Partial<InstanceType<typeof ApiError>>);

    expect(fake.calls.some((call) => call.table === "fixed_bills" && call.method === "insert")).toBe(false);
  });
});
