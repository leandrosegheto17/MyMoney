import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient } from "./testSupabaseClient";

const fake = createFakeSupabaseClient();
vi.mock("../supabase/client", () => ({
  getSupabaseClient: () => fake.client,
}));

const { createGoal, createContribution } = await import("./goals");
const { ApiError } = await import("./errors");

describe("goals API client — user_id explícito no INSERT (Bloqueio 015, SEC-DEBT-008, defesa em profundidade)", () => {
  beforeEach(() => {
    fake.calls.length = 0;
    fake.setAuthUser({ id: "test-user-id" });
  });

  it("createGoal: inclui user_id da sessão ativa no payload do INSERT", async () => {
    fake.queueResult({ data: { id: "goal-1" }, error: null, status: 201 });
    fake.setAuthUser({ id: "user-abc" });

    await createGoal({ name: "Viagem", target_amount_cents: 500000 });

    const insertCall = fake.calls.find((call) => call.table === "goals" && call.method === "insert");
    expect(insertCall?.args[0]).toMatchObject({ name: "Viagem", user_id: "user-abc" });
  });

  it("createGoal: sessão inválida lança ApiError kind 'forbidden' antes de qualquer INSERT", async () => {
    fake.setAuthUser(null);

    await expect(createGoal({ name: "Viagem", target_amount_cents: 500000 })).rejects.toMatchObject({
      kind: "forbidden",
    } satisfies Partial<InstanceType<typeof ApiError>>);

    expect(fake.calls.some((call) => call.table === "goals" && call.method === "insert")).toBe(false);
  });

  it("createContribution: inclui user_id da sessão ativa no payload do INSERT", async () => {
    fake.queueResult({ data: { id: "contrib-1" }, error: null, status: 201 });
    fake.setAuthUser({ id: "user-abc" });

    await createContribution({ goal_id: "goal-1", amount_cents: 10000 });

    const insertCall = fake.calls.find((call) => call.table === "contributions" && call.method === "insert");
    expect(insertCall?.args[0]).toMatchObject({ goal_id: "goal-1", user_id: "user-abc" });
  });

  it("createContribution: sessão inválida lança ApiError kind 'forbidden' antes de qualquer INSERT", async () => {
    fake.setAuthUser(null);

    await expect(createContribution({ goal_id: "goal-1", amount_cents: 10000 })).rejects.toMatchObject({
      kind: "forbidden",
    } satisfies Partial<InstanceType<typeof ApiError>>);

    expect(fake.calls.some((call) => call.table === "contributions" && call.method === "insert")).toBe(false);
  });
});
