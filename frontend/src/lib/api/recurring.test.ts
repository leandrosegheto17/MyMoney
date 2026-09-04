import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient } from "./testSupabaseClient";

const fake = createFakeSupabaseClient();
vi.mock("../supabase/client", () => ({
  getSupabaseClient: () => fake.client,
}));

const { createRecurringTemplate, createRecurringTemplateAdjustment, createInstallmentPurchase } = await import("./recurring");
const { ApiError } = await import("./errors");

describe("recurring API client — user_id explícito no INSERT (Bloqueio 015, SEC-DEBT-008, defesa em profundidade)", () => {
  beforeEach(() => {
    fake.calls.length = 0;
    fake.setAuthUser({ id: "test-user-id" });
  });

  it("createRecurringTemplate: inclui user_id da sessão ativa no payload do INSERT", async () => {
    fake.queueResult({ data: { id: "tmpl-1" }, error: null, status: 201 });
    fake.setAuthUser({ id: "user-abc" });

    await createRecurringTemplate({
      description: "Assinatura streaming",
      amount_cents: 2990,
      category_id: "cat-1",
      account_id: "acc-1",
      payment_method_id: "pm-1",
      day_of_month: 10,
      start_date: "2026-09-01",
    });

    const insertCall = fake.calls.find((call) => call.table === "recurring_templates" && call.method === "insert");
    expect(insertCall?.args[0]).toMatchObject({ description: "Assinatura streaming", user_id: "user-abc" });
  });

  it("createRecurringTemplate: sessão inválida lança ApiError kind 'forbidden' antes de qualquer INSERT", async () => {
    fake.setAuthUser(null);

    await expect(
      createRecurringTemplate({
        description: "Assinatura streaming",
        amount_cents: 2990,
        category_id: "cat-1",
        account_id: "acc-1",
        payment_method_id: "pm-1",
        day_of_month: 10,
        start_date: "2026-09-01",
      }),
    ).rejects.toMatchObject({ kind: "forbidden" } satisfies Partial<InstanceType<typeof ApiError>>);

    expect(fake.calls.some((call) => call.table === "recurring_templates" && call.method === "insert")).toBe(false);
  });

  it("createRecurringTemplateAdjustment: inclui user_id da sessão ativa no payload do INSERT", async () => {
    fake.queueResult({ data: { id: "adj-1" }, error: null, status: 201 });
    fake.setAuthUser({ id: "user-abc" });

    await createRecurringTemplateAdjustment({ recurring_template_id: "tmpl-1", effective_from: "2026-10-01", amount_cents: 3500 });

    const insertCall = fake.calls.find((call) => call.table === "recurring_template_adjustments" && call.method === "insert");
    expect(insertCall?.args[0]).toMatchObject({ recurring_template_id: "tmpl-1", user_id: "user-abc" });
  });

  it("createRecurringTemplateAdjustment: sessão inválida lança ApiError kind 'forbidden' antes de qualquer INSERT", async () => {
    fake.setAuthUser(null);

    await expect(
      createRecurringTemplateAdjustment({ recurring_template_id: "tmpl-1", effective_from: "2026-10-01", amount_cents: 3500 }),
    ).rejects.toMatchObject({ kind: "forbidden" } satisfies Partial<InstanceType<typeof ApiError>>);

    expect(fake.calls.some((call) => call.table === "recurring_template_adjustments" && call.method === "insert")).toBe(false);
  });

  it("createInstallmentPurchase: inclui user_id da sessão ativa no payload do INSERT", async () => {
    fake.queueResult({ data: { id: "inst-1" }, error: null, status: 201 });
    fake.setAuthUser({ id: "user-abc" });

    await createInstallmentPurchase({
      description: "Notebook",
      total_amount_cents: 300000,
      installments_count: 10,
      category_id: "cat-1",
      account_id: "acc-1",
      payment_method_id: "pm-credit",
      purchase_date: "2026-09-01",
    });

    const insertCall = fake.calls.find((call) => call.table === "installment_purchases" && call.method === "insert");
    expect(insertCall?.args[0]).toMatchObject({ description: "Notebook", user_id: "user-abc" });
  });

  it("createInstallmentPurchase: sessão inválida lança ApiError kind 'forbidden' antes de qualquer INSERT", async () => {
    fake.setAuthUser(null);

    await expect(
      createInstallmentPurchase({
        description: "Notebook",
        total_amount_cents: 300000,
        installments_count: 10,
        category_id: "cat-1",
        account_id: "acc-1",
        payment_method_id: "pm-credit",
        purchase_date: "2026-09-01",
      }),
    ).rejects.toMatchObject({ kind: "forbidden" } satisfies Partial<InstanceType<typeof ApiError>>);

    expect(fake.calls.some((call) => call.table === "installment_purchases" && call.method === "insert")).toBe(false);
  });
});
