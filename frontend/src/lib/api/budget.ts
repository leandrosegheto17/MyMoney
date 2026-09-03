import { getSupabaseClient } from "../supabase/client";
import { unwrap } from "./request";
import type { Budget, BudgetStatusItem, NewBudget } from "./types";

/** Primeiro dia do mês (formato `YYYY-MM-01`) — convenção de `Budget.month` no contrato. */
export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

/** `GET /budget?month=eq.{month}` */
export async function listBudgets(month: string = monthKey()): Promise<Budget[]> {
  return unwrap(getSupabaseClient().from("budget").select("*").eq("month", month));
}

/** `POST /budget` — 409 se já existir orçamento para categoria/mês (usar `updateBudget` em vez disso). */
export async function createBudget(input: NewBudget): Promise<Budget> {
  return unwrap(getSupabaseClient().from("budget").insert(input).select().single());
}

/** `PATCH /budget?id=eq.{id}` */
export async function updateBudget(id: string, input: Partial<Pick<NewBudget, "limit_cents" | "alert_threshold_pct">>): Promise<Budget> {
  return unwrap(getSupabaseClient().from("budget").update(input).eq("id", id).select().single());
}

/** `DELETE /budget?id=eq.{id}` */
export async function deleteBudget(id: string): Promise<void> {
  await unwrap(getSupabaseClient().from("budget").delete().eq("id", id).select());
}

/** `POST /rpc/get_budget_status` (BE-M-08) — % gasto vs. teto por orçamento do mês, com `alert_level` (RN-04). */
export async function getBudgetStatus(month?: string): Promise<BudgetStatusItem[]> {
  return unwrap(getSupabaseClient().rpc("get_budget_status", { p_month: month ?? null }));
}
