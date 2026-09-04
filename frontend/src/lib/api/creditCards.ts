import { getSupabaseClient } from "../supabase/client";
import { unwrap, withOwnerId } from "./request";
import type { CreditCard, CreditCardAvailableLimitItem, Invoice, NewCreditCard, PaymentMethod } from "./types";

/** `GET /credit_cards` (RF-F2-01) — `API-CONTRACT.yaml` v0.8.0. */
export async function listCreditCards(): Promise<CreditCard[]> {
  return unwrap(getSupabaseClient().from("credit_cards").select("*").order("created_at", { ascending: true }));
}

/**
 * `POST /credit_cards` (RF-F2-01 AC1) — dispara a criação automática da forma de pagamento "crédito" vinculada (trigger).
 * `user_id` explícito na sessão ativa (defesa em profundidade, Bloqueio 015/`SEC-DEBT-008`).
 */
export async function createCreditCard(input: NewCreditCard): Promise<CreditCard> {
  return unwrap(getSupabaseClient().from("credit_cards").insert(await withOwnerId(input)).select().single());
}

/** `PATCH /credit_cards?id=eq.{id}` */
export async function updateCreditCard(id: string, input: Partial<NewCreditCard>): Promise<CreditCard> {
  return unwrap(getSupabaseClient().from("credit_cards").update(input).eq("id", id).select().single());
}

/** `DELETE /credit_cards?id=eq.{id}` — 409 se existir lançamento usando a forma de pagamento derivada. */
export async function deleteCreditCard(id: string): Promise<void> {
  await unwrap(getSupabaseClient().from("credit_cards").delete().eq("id", id).select());
}

/** `GET /payment_methods?credit_card_id=eq.{id}` — forma de pagamento "crédito" derivada de um cartão (BE-F2-01). */
export async function getCreditCardPaymentMethod(creditCardId: string): Promise<PaymentMethod | null> {
  const rows = await unwrap<PaymentMethod[]>(getSupabaseClient().from("payment_methods").select("*").eq("credit_card_id", creditCardId));
  return rows[0] ?? null;
}

/** `GET /invoices?credit_card_id=eq.{id}&order=competencia.asc` (RF-F2-05) — competência atual + 2 futuras (DIR-13). */
export async function listInvoicesByCard(creditCardId: string): Promise<Invoice[]> {
  return unwrap(
    getSupabaseClient().from("invoices").select("*").eq("credit_card_id", creditCardId).order("competencia", { ascending: true }),
  );
}

/** `POST /rpc/get_credit_cards_available_limit` (RN-06) — limite disponível por cartão, sempre visível em S-CARD-03. */
export async function getCreditCardsAvailableLimit(): Promise<CreditCardAvailableLimitItem[]> {
  return unwrap(getSupabaseClient().rpc("get_credit_cards_available_limit", {}));
}
