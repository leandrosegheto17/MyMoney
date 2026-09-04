import { getSupabaseClient } from "../supabase/client";
import { unwrap, withOwnerId } from "./request";
import { markTransactionCleared } from "./transactions";
import type { FixedBill, FixedBillStatusItem, NewFixedBill } from "./types";

/** `GET /fixed_bills` (RF-F2-06) — `API-CONTRACT.yaml` v0.15.0. */
export async function listFixedBills(): Promise<FixedBill[]> {
  return unwrap(getSupabaseClient().from("fixed_bills").select("*").order("created_at", { ascending: true }));
}

/**
 * `POST /fixed_bills` (RF-F2-06 AC1) — passa a gerar 1 lançamento previsto (pending) por competência.
 * `user_id` explícito na sessão ativa (defesa em profundidade, Bloqueio 015/`SEC-DEBT-008`).
 */
export async function createFixedBill(input: NewFixedBill): Promise<FixedBill> {
  return unwrap(getSupabaseClient().from("fixed_bills").insert(await withOwnerId(input)).select().single());
}

/** `PATCH /fixed_bills?id=eq.{id}` — editar dados cadastrais ou encerrar (`end_date`). */
export async function updateFixedBill(id: string, input: Partial<NewFixedBill>): Promise<FixedBill> {
  return unwrap(getSupabaseClient().from("fixed_bills").update(input).eq("id", id).select().single());
}

/** `DELETE /fixed_bills?id=eq.{id}` — lançamentos já gerados são preservados (RN-07, `fixed_bill_id` vira NULL). */
export async function deleteFixedBill(id: string): Promise<void> {
  await unwrap(getSupabaseClient().from("fixed_bills").delete().eq("id", id).select());
}

/**
 * `POST /rpc/get_fixed_bills_status` (RF-F2-06/RF-F2-07 AC2) — `is_overdue` já vem calculado
 * pelo servidor (DIR-06: nunca recalcular data de vencimento no client).
 */
export async function getFixedBillsStatus(): Promise<FixedBillStatusItem[]> {
  return unwrap(getSupabaseClient().rpc("get_fixed_bills_status", {}));
}

/**
 * "Marcar como paga" (RF-F2-06 AC2, S-FIX-03) — não é um endpoint próprio de
 * `fixed_bills`: reaproveita `markTransactionCleared` (`transactions.ts`) sobre a
 * Transaction gerada (`current_transaction_id` de `FixedBillStatusItem`), conforme
 * `API-CONTRACT.yaml`.
 */
export async function markFixedBillTransactionAsPaid(transactionId: string): Promise<void> {
  await markTransactionCleared(transactionId);
}
