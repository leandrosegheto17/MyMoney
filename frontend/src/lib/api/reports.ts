import { getSupabaseClient } from "../supabase/client";
import { unwrap } from "./request";
import type { IncomeExpenseReportItem, NetWorthEvolutionItem } from "./types";

/**
 * `POST /rpc/get_income_expense_report` (RF-F2-10 AC1-2, S-REP-01) — janela fixa de até
 * 6 meses; a resposta só contém mês com dado real (nunca zero fabricado, AC2) — o client
 * nunca deve completar os meses ausentes com zero, só exibir a nota de janela parcial.
 */
export async function getIncomeExpenseReport(): Promise<IncomeExpenseReportItem[]> {
  return unwrap(getSupabaseClient().rpc("get_income_expense_report", {}));
}

/**
 * `POST /rpc/get_net_worth_evolution` (RF-F3-05 AC1-2, S-REP-02, BE-F3-06) — série temporal
 * do saldo consolidado, mesma janela de até 6 meses de `get_income_expense_report`.
 * `accountId` omitido/`undefined` = visão consolidada (todas as contas ativas, AC1);
 * informado = restringe a 1 conta (AC2) — conta alheia/inativa retorna lista vazia, nunca erro.
 */
export async function getNetWorthEvolution(accountId?: string): Promise<NetWorthEvolutionItem[]> {
  return unwrap(getSupabaseClient().rpc("get_net_worth_evolution", { p_account_id: accountId ?? null }));
}
