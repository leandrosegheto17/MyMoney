import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient } from "./testSupabaseClient";

const fake = createFakeSupabaseClient();
vi.mock("../supabase/client", () => ({
  getSupabaseClient: () => fake.client,
}));

const { createPaymentMethod } = await import("./paymentMethods");
const { ApiError } = await import("./errors");

describe("paymentMethods API client — user_id explícito no INSERT (Bloqueio 015, SEC-DEBT-008, defesa em profundidade)", () => {
  beforeEach(() => {
    fake.calls.length = 0;
    fake.setAuthUser({ id: "test-user-id" });
  });

  it("createPaymentMethod: inclui user_id da sessão ativa no payload do INSERT", async () => {
    fake.queueResult({ data: { id: "pm-1" }, error: null, status: 201 });
    fake.setAuthUser({ id: "user-abc" });

    await createPaymentMethod({ type: "pix", name: "Pix pessoal" });

    const insertCall = fake.calls.find((call) => call.table === "payment_methods" && call.method === "insert");
    expect(insertCall?.args[0]).toMatchObject({ name: "Pix pessoal", user_id: "user-abc" });
  });

  it("createPaymentMethod: sessão inválida lança ApiError kind 'forbidden' antes de qualquer INSERT", async () => {
    fake.setAuthUser(null);

    await expect(createPaymentMethod({ type: "pix", name: "Pix pessoal" })).rejects.toMatchObject({
      kind: "forbidden",
    } satisfies Partial<InstanceType<typeof ApiError>>);

    expect(fake.calls.some((call) => call.table === "payment_methods" && call.method === "insert")).toBe(false);
  });
});
