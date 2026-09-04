import { getSupabaseClient } from "../supabase/client";
import { unwrap, withOwnerId } from "./request";
import type {
  InstallmentPurchase,
  InstallmentPurchaseProgress,
  NewInstallmentPurchase,
  NewRecurringTemplate,
  NewRecurringTemplateAdjustment,
  RecurringTemplate,
  RecurringTemplateAdjustment,
} from "./types";

// ============================================================================
// Recorrência (BE-F2-03/04) — `API-CONTRACT.yaml` v0.11.0
// ============================================================================

/** `GET /recurring_templates` (RF-F2-02) */
export async function listRecurringTemplates(): Promise<RecurringTemplate[]> {
  return unwrap(getSupabaseClient().from("recurring_templates").select("*").order("created_at", { ascending: true }));
}

/**
 * `POST /recurring_templates` (RF-F2-02 AC1)
 * `user_id` explícito na sessão ativa (defesa em profundidade, Bloqueio 015/`SEC-DEBT-008`).
 */
export async function createRecurringTemplate(input: NewRecurringTemplate): Promise<RecurringTemplate> {
  return unwrap(getSupabaseClient().from("recurring_templates").insert(await withOwnerId(input)).select().single());
}

/**
 * `PATCH /recurring_templates?id=eq.{id}` — editar dados cadastrais ou encerrar (`end_date`, RF-F2-02 AC2).
 * **Nunca inclui `amount_cents`** — imutável após a criação (BE-F2-04, 400 se tentado); reajuste é sempre via `createRecurringTemplateAdjustment`.
 */
export async function updateRecurringTemplate(
  id: string,
  input: Partial<Omit<NewRecurringTemplate, "amount_cents">>,
): Promise<RecurringTemplate> {
  return unwrap(getSupabaseClient().from("recurring_templates").update(input).eq("id", id).select().single());
}

/** `DELETE /recurring_templates?id=eq.{id}` — lançamentos já gerados são preservados (RN-07, `recurring_rule_id` vira NULL). */
export async function deleteRecurringTemplate(id: string): Promise<void> {
  await unwrap(getSupabaseClient().from("recurring_templates").delete().eq("id", id).select());
}

/** `GET /recurring_template_adjustments?recurring_template_id=eq.{id}` (RF-F2-03) — histórico de reajuste. */
export async function listRecurringTemplateAdjustments(recurringTemplateId: string): Promise<RecurringTemplateAdjustment[]> {
  return unwrap(
    getSupabaseClient()
      .from("recurring_template_adjustments")
      .select("*")
      .eq("recurring_template_id", recurringTemplateId)
      .order("effective_from", { ascending: true }),
  );
}

/**
 * `POST /recurring_template_adjustments` (RF-F2-03 AC1/AC2) — o Frontend **deve** confirmar
 * explicitamente com o usuário "a partir de qual competência" antes de chamar esta função
 * (AC1); cancelar a confirmação = simplesmente não chamar (AC3). 400 se `effective_from`
 * for retroativo ao mês corrente (RN-02, rejeitado pelo servidor, nunca validado só no client).
 * `user_id` explícito na sessão ativa (defesa em profundidade, Bloqueio 015/`SEC-DEBT-008`).
 */
export async function createRecurringTemplateAdjustment(input: NewRecurringTemplateAdjustment): Promise<RecurringTemplateAdjustment> {
  return unwrap(getSupabaseClient().from("recurring_template_adjustments").insert(await withOwnerId(input)).select().single());
}

// ============================================================================
// Parcelamento (BE-F2-05) — `API-CONTRACT.yaml` v0.12.0
// ============================================================================

/** `GET /installment_purchases` (RF-F2-04) */
export async function listInstallmentPurchases(): Promise<InstallmentPurchase[]> {
  return unwrap(getSupabaseClient().from("installment_purchases").select("*").order("purchase_date", { ascending: false }));
}

/**
 * `POST /installment_purchases` (RF-F2-04 AC1) — 400 se `payment_method_id` não for `type=credit_card`.
 * `user_id` explícito na sessão ativa (defesa em profundidade, Bloqueio 015/`SEC-DEBT-008`).
 */
export async function createInstallmentPurchase(input: NewInstallmentPurchase): Promise<InstallmentPurchase> {
  return unwrap(getSupabaseClient().from("installment_purchases").insert(await withOwnerId(input)).select().single());
}

/** `PATCH /installment_purchases?id=eq.{id}` — descrição/categoria/conta; os demais campos ficam imutáveis após a 1ª parcela gerada. */
export async function updateInstallmentPurchase(
  id: string,
  input: Partial<Pick<NewInstallmentPurchase, "description" | "category_id" | "account_id">>,
): Promise<InstallmentPurchase> {
  return unwrap(getSupabaseClient().from("installment_purchases").update(input).eq("id", id).select().single());
}

/** `DELETE /installment_purchases?id=eq.{id}` — parcelas já geradas são preservadas (RN-07). */
export async function deleteInstallmentPurchase(id: string): Promise<void> {
  await unwrap(getSupabaseClient().from("installment_purchases").delete().eq("id", id).select());
}

/** `POST /rpc/get_installment_purchases_progress` (RF-F2-04 AC2) — "Parcela X de N", nunca percentual genérico. */
export async function getInstallmentPurchasesProgress(): Promise<InstallmentPurchaseProgress[]> {
  return unwrap(getSupabaseClient().rpc("get_installment_purchases_progress", {}));
}
