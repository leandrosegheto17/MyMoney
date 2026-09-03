import { getSupabaseClient } from "../supabase/client";
import { unwrap } from "./request";
import type { Account, NewAccount } from "./types";

/** `GET /accounts` — `API-CONTRACT.yaml`. Por padrão lista todas (ativas + inativas); a tela decide o filtro. */
export async function listAccounts(options?: { onlyActive?: boolean }): Promise<Account[]> {
  let query = getSupabaseClient().from("accounts").select("*").order("created_at", { ascending: true });
  if (options?.onlyActive) {
    query = query.eq("is_active", true);
  }
  return unwrap(query);
}

/** `POST /accounts` — dispara seed das 4 formas de pagamento padrão se for a 1ª conta ativa (BE-M-02). */
export async function createAccount(input: NewAccount): Promise<Account> {
  return unwrap(getSupabaseClient().from("accounts").insert(input).select().single());
}

/** `PATCH /accounts?id=eq.{id}` — editar nome/saldo inicial recalcula saldo consolidado (RF-MVP-01 AC3). */
export async function updateAccount(id: string, input: Partial<NewAccount>): Promise<Account> {
  return unwrap(getSupabaseClient().from("accounts").update(input).eq("id", id).select().single());
}

/** `PATCH /accounts?id=eq.{id}` com `is_active: false` — alternativa a `DELETE` quando há lançamento vinculado (RN-08). */
export async function inactivateAccount(id: string): Promise<Account> {
  return updateAccount(id, { is_active: false });
}

/**
 * `DELETE /accounts?id=eq.{id}` — 409 se houver lançamento vinculado
 * (`accounts_before_delete_block_linked`, RN-08); a tela deve capturar `ApiError`
 * `kind === "conflict"` e oferecer `inactivateAccount` como alternativa.
 */
export async function deleteAccount(id: string): Promise<void> {
  await unwrap(getSupabaseClient().from("accounts").delete().eq("id", id).select());
}
