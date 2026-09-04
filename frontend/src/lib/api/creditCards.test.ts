import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient } from "./testSupabaseClient";

const fake = createFakeSupabaseClient();
vi.mock("../supabase/client", () => ({
  getSupabaseClient: () => fake.client,
}));

const { createCreditCard } = await import("./creditCards");
const { ApiError } = await import("./errors");

describe("creditCards API client — user_id explícito no INSERT (Bloqueio 015, SEC-DEBT-008, defesa em profundidade)", () => {
  beforeEach(() => {
    fake.calls.length = 0;
    fake.setAuthUser({ id: "test-user-id" });
  });

  it("createCreditCard: inclui user_id da sessão ativa no payload do INSERT", async () => {
    fake.queueResult({ data: { id: "card-1" }, error: null, status: 201 });
    fake.setAuthUser({ id: "user-abc" });

    await createCreditCard({ name: "Nubank", limit_cents: 500000, closing_day: 10, due_day: 17 });

    const insertCall = fake.calls.find((call) => call.table === "credit_cards" && call.method === "insert");
    expect(insertCall?.args[0]).toMatchObject({ name: "Nubank", user_id: "user-abc" });
  });

  it("createCreditCard: sessão inválida lança ApiError kind 'forbidden' antes de qualquer INSERT", async () => {
    fake.setAuthUser(null);

    await expect(
      createCreditCard({ name: "Nubank", limit_cents: 500000, closing_day: 10, due_day: 17 }),
    ).rejects.toMatchObject({ kind: "forbidden" } satisfies Partial<InstanceType<typeof ApiError>>);

    expect(fake.calls.some((call) => call.table === "credit_cards" && call.method === "insert")).toBe(false);
  });
});
