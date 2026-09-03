import { getSupabaseClient } from "../supabase/client";
import { unwrap } from "./request";
import type { NewPaymentMethod, PaymentMethod } from "./types";

/** `GET /payment_methods` — inclui as formas padrão (`is_system_default = true`) e as customizadas do usuário. */
export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  return unwrap(getSupabaseClient().from("payment_methods").select("*").order("is_system_default", { ascending: false }).order("created_at", { ascending: true }));
}

/** `POST /payment_methods` — RF-MVP-02 AC3. */
export async function createPaymentMethod(input: NewPaymentMethod): Promise<PaymentMethod> {
  return unwrap(getSupabaseClient().from("payment_methods").insert(input).select().single());
}

/** `PATCH /payment_methods?id=eq.{id}` — 403 se `is_system_default = true` (RLS). */
export async function updatePaymentMethod(id: string, input: Partial<NewPaymentMethod>): Promise<PaymentMethod> {
  return unwrap(getSupabaseClient().from("payment_methods").update(input).eq("id", id).select().single());
}

/** `DELETE /payment_methods?id=eq.{id}` — 403 se `is_system_default = true` (RLS). */
export async function deletePaymentMethod(id: string): Promise<void> {
  await unwrap(getSupabaseClient().from("payment_methods").delete().eq("id", id).select());
}
