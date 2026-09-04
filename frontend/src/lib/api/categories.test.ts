import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient } from "./testSupabaseClient";

const fake = createFakeSupabaseClient();
vi.mock("../supabase/client", () => ({
  getSupabaseClient: () => fake.client,
}));

const { createCategory } = await import("./categories");
const { ApiError } = await import("./errors");

describe("categories API client — user_id explícito no INSERT (Bloqueio 015, SEC-DEBT-008, defesa em profundidade)", () => {
  beforeEach(() => {
    fake.calls.length = 0;
    fake.setAuthUser({ id: "test-user-id" });
  });

  it("createCategory: inclui user_id da sessão ativa no payload do INSERT", async () => {
    fake.queueResult({ data: { id: "cat-1" }, error: null, status: 201 });
    fake.setAuthUser({ id: "user-abc" });

    await createCategory({ name: "Mercado", kind: "expense" });

    const insertCall = fake.calls.find((call) => call.table === "categories" && call.method === "insert");
    expect(insertCall?.args[0]).toMatchObject({ name: "Mercado", user_id: "user-abc" });
  });

  it("createCategory: sessão inválida lança ApiError kind 'forbidden' antes de qualquer INSERT", async () => {
    fake.setAuthUser(null);

    await expect(createCategory({ name: "Mercado", kind: "expense" })).rejects.toMatchObject({
      kind: "forbidden",
    } satisfies Partial<InstanceType<typeof ApiError>>);

    expect(fake.calls.some((call) => call.table === "categories" && call.method === "insert")).toBe(false);
  });
});
