import { getSupabaseClient } from "../supabase/client";
import { unwrap } from "./request";
import type { IncomeExpenseReportItem } from "./types";

/**
 * `POST /rpc/get_income_expense_report` (RF-F2-10 AC1-2, S-REP-01) — janela fixa de até
 * 6 meses; a resposta só contém mês com dado real (nunca zero fabricado, AC2) — o client
 * nunca deve completar os meses ausentes com zero, só exibir a nota de janela parcial.
 */
export async function getIncomeExpenseReport(): Promise<IncomeExpenseReportItem[]> {
  return unwrap(getSupabaseClient().rpc("get_income_expense_report", {}));
}
