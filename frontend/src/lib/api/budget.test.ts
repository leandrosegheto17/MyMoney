import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient } from "./testSupabaseClient";

const fake = createFakeSupabaseClient();
vi.mock("../supabase/client", () => ({
  getSupabaseClient: () => fake.client,
}));

const { createBudget } = await import("./budget");
const { ApiError } = await import("./errors");

describe("budget API client — user_id explícito no INSERT (Bloqueio 015, SEC-DEBT-008, defesa em profundidade)", () => {
  beforeEach(() => {
    fake.calls.length = 0;
    fake.setAuthUser({ id: "test-user-id" });
  });

  it("createBudget: inclui user_id da sessão ativa no payload do INSERT", async () => {
    fake.queueResult({ data: { id: "budget-1" }, error: null, status: 201 });
    fake.setAuthUser({ id: "user-abc" });

    await createBudget({ category_id: "cat-1", month: "2026-09-01", limit_cents: 50000 });

    const insertCall = fake.calls.find((call) => call.table === "budget" && call.method === "insert");
    expect(insertCall?.args[0]).toMatchObject({ category_id: "cat-1", user_id: "user-abc" });
  });

  it("createBudget: sessão inválida lança ApiError kind 'forbidden' antes de qualquer INSERT", async () => {
    fake.setAuthUser(null);

    await expect(
      createBudget({ category_id: "cat-1", month: "2026-09-01", limit_cents: 50000 }),
    ).rejects.toMatchObject({ kind: "forbidden" } satisfies Partial<InstanceType<typeof ApiError>>);

    expect(fake.calls.some((call) => call.table === "budget" && call.method === "insert")).toBe(false);
  });
});
