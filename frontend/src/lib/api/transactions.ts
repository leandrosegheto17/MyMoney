import { getSupabaseClient } from "../supabase/client";
import { unwrap, withOwnerId } from "./request";
import type { NewTransaction, Transaction } from "./types";

export interface ListTransactionsFilters {
  accountId?: string;
  paymentMethodId?: string;
  categoryId?: string;
  /** Data inicial (inclusive), formato `YYYY-MM-DD` — usado para o filtro de mês corrente (RF-MVP-04 AC5). */
  fromDate?: string;
  /** Data final (inclusive), formato `YYYY-MM-DD`. */
  toDate?: string;
}

/** `GET /transactions` — mês corrente por padrão (RF-MVP-04 AC5), ordenado do mais recente para o mais antigo. */
export async function listTransactions(filters: ListTransactionsFilters = {}): Promise<Transaction[]> {
  let query = getSupabaseClient().from("transactions").select("*").order("transaction_date", { ascending: false }).order("created_at", { ascending: false });
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.paymentMethodId) query = query.eq("payment_method_id", filters.paymentMethodId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.fromDate) query = query.gte("transaction_date", filters.fromDate);
  if (filters.toDate) query = query.lte("transaction_date", filters.toDate);
  return unwrap(query);
}

/**
 * `POST /transactions` — cria lançamento manual (RF-MVP-04 AC1); `accounts.current_balance_cents`
 * já reflete o efeito na resposta (trigger `apply_transaction_effect`), por isso o
 * client atualiza o próprio estado com esta resposta em vez de esperar Realtime (DIR-12).
 * `user_id` explícito na sessão ativa (defesa em profundidade, Bloqueio 015/`SEC-DEBT-008`).
 */
export async function createTransaction(input: NewTransaction): Promise<Transaction> {
  return unwrap(getSupabaseClient().from("transactions").insert(await withOwnerId(input)).select().single());
}

/** `PATCH /transactions?id=eq.{id}` — recalcula saldo (reverte efeito antigo, aplica o novo). */
export async function updateTransaction(id: string, input: Partial<NewTransaction>): Promise<Transaction> {
  return unwrap(getSupabaseClient().from("transactions").update(input).eq("id", id).select().single());
}

/** `DELETE /transactions?id=eq.{id}` — reverte efeito no saldo da conta. */
export async function deleteTransaction(id: string): Promise<void> {
  await unwrap(getSupabaseClient().from("transactions").delete().eq("id", id).select());
}

/**
 * `PATCH /transactions?id=eq.{id}` com `{status:"cleared"}` — Fase 2 (BE-F2-06): é assim
 * que "marcar conta fixa como paga" (RF-F2-06 AC2, S-FIX-03) funciona, reaproveitando o
 * contrato existente de `/transactions` em vez de um endpoint próprio (DIR-06, achado
 * documentado em `API-CONTRACT.yaml`). O saldo da conta já reflete o lançamento desde a
 * criação, independente do status — este PATCH só muda a exibição pending→cleared.
 */
export async function markTransactionCleared(id: string): Promise<Transaction> {
  return unwrap(getSupabaseClient().from("transactions").update({ status: "cleared" }).eq("id", id).select().single());
}
