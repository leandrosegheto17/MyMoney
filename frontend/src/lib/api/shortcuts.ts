import { getSupabaseClient } from "../supabase/client";
import { unwrap } from "./request";
import type { TransactionShortcut } from "./types";

/**
 * `POST /rpc/get_transaction_shortcuts` — RF-REF-03 AC1/AC7/AC8, `ADR-015` Decisão 1,
 * `API-CONTRACT.yaml` v0.18.0 (`BE-REF-02`, migration
 * `20260904120000_be_ref_02_transaction_shortcuts.sql`, aplicada em produção). Até 10
 * linhas `(category_id, payment_method_id)` já ordenadas pelo desempate de RN-12/RN-13
 * no servidor — nenhum `.sort()`/reordenação adicional aqui (DIR-34). Chamada 1x por
 * carregamento da tela de lançamentos, sem cache client-side (AC8). Falha da RPC (rede,
 * etc.) é tratada pelo chamador (`TransactionsPage`) como "0 linhas" — mesmo
 * comportamento silencioso do caso "sem lançamento no histórico" (`UX-SPEC.md`
 * Seção 4.2 — nunca bloqueia nem exibe `Banner`).
 */
export async function getTransactionShortcuts(): Promise<TransactionShortcut[]> {
  return unwrap(getSupabaseClient().rpc("get_transaction_shortcuts", {}));
}
