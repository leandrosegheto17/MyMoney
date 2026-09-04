import { getSupabaseClient } from "../supabase/client";
import { unwrap, withOwnerId } from "./request";
import type { Category, NewCategory, Transaction } from "./types";

/** `GET /categories` — categorias padrão do sistema (`user_id = null`) + do usuário. */
export async function listCategories(): Promise<Category[]> {
  return unwrap(getSupabaseClient().from("categories").select("*").order("name", { ascending: true }));
}

/**
 * `POST /categories` — 409 se hierarquia inválida (`validate_category_hierarchy`).
 * `user_id` explícito na sessão ativa (defesa em profundidade, Bloqueio 015/`SEC-DEBT-008`).
 */
export async function createCategory(input: NewCategory): Promise<Category> {
  return unwrap(getSupabaseClient().from("categories").insert(await withOwnerId(input)).select().single());
}

/** `PATCH /categories?id=eq.{id}` */
export async function updateCategory(id: string, input: Partial<NewCategory>): Promise<Category> {
  return unwrap(getSupabaseClient().from("categories").update(input).eq("id", id).select().single());
}

/**
 * `DELETE /categories?id=eq.{id}` — 409 se houver lançamento/orçamento vinculado
 * (RN-09). A tela deve capturar `ApiError` `kind === "conflict"` e chamar
 * `listTransactionsByCategory` para exibir a lista de lançamentos afetados (S-CAT-03).
 */
export async function deleteCategory(id: string): Promise<void> {
  await unwrap(getSupabaseClient().from("categories").delete().eq("id", id).select());
}

/** `GET /transactions?category_id=eq.{id}` — usado por S-CAT-03 (RF-MVP-03 AC3, "Ver lançamentos desta categoria"). */
export async function listTransactionsByCategory(categoryId: string): Promise<Transaction[]> {
  return unwrap(
    getSupabaseClient().from("transactions").select("*").eq("category_id", categoryId).order("transaction_date", { ascending: false }),
  );
}
