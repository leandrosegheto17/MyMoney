import { getSupabaseClient } from "../supabase/client";
import { unwrap } from "./request";
import type { MonthlyCategorySummaryItem, MonthProvision } from "./types";

/**
 * `POST /rpc/get_month_provision` — RF-MVP-05 AC1. Só `current_total_balance_cents`
 * é confiável para saldo consolidado (`API-CONTRACT.yaml`: `provisioned_balance_cents`
 * tem double-counting confirmado, deprecated, nunca consumido no MVP).
 */
export async function getMonthProvision(): Promise<MonthProvision> {
  return unwrap(getSupabaseClient().rpc("get_month_provision", {}));
}

/** `POST /rpc/get_monthly_category_summary` — distribuição de entradas/saídas por categoria (RF-MVP-06 AC1/AC2). */
export async function getMonthlyCategorySummary(month?: string): Promise<MonthlyCategorySummaryItem[]> {
  return unwrap(getSupabaseClient().rpc("get_monthly_category_summary", { p_month: month ?? null }));
}

/** `POST /rpc/get_month_transaction_count` — RF-MVP-06 AC3. */
export async function getMonthTransactionCount(month?: string): Promise<number> {
  return unwrap(getSupabaseClient().rpc("get_month_transaction_count", { p_month: month ?? null }));
}
