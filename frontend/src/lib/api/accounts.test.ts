import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient } from "./testSupabaseClient";

const fake = createFakeSupabaseClient();
vi.mock("../supabase/client", () => ({
  getSupabaseClient: () => fake.client,
}));

const { createAccount } = await import("./accounts");
const { ApiError } = await import("./errors");

describe("accounts API client — user_id explícito no INSERT (Bloqueio 015, SEC-DEBT-008, defesa em profundidade)", () => {
  beforeEach(() => {
    fake.calls.length = 0;
    fake.setAuthUser({ id: "test-user-id" });
  });

  it("createAccount: inclui user_id da sessão ativa no payload do INSERT", async () => {
    fake.queueResult({ data: { id: "acc-1" }, error: null, status: 201 });
    fake.setAuthUser({ id: "user-abc" });

    await createAccount({ name: "Carteira", type: "wallet", currency: "BRL", initial_balance_cents: 0 });

    const insertCall = fake.calls.find((call) => call.table === "accounts" && call.method === "insert");
    expect(insertCall?.args[0]).toMatchObject({ name: "Carteira", user_id: "user-abc" });
  });

  it("createAccount: sessão inválida lança ApiError kind 'forbidden' antes de qualquer INSERT", async () => {
    fake.setAuthUser(null);

    await expect(
      createAccount({ name: "Carteira", type: "wallet", currency: "BRL", initial_balance_cents: 0 }),
    ).rejects.toMatchObject({ kind: "forbidden" } satisfies Partial<InstanceType<typeof ApiError>>);

    expect(fake.calls.some((call) => call.table === "accounts" && call.method === "insert")).toBe(false);
  });
});
