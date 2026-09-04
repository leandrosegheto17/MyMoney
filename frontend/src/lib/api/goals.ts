import { getSupabaseClient } from "../supabase/client";
import { unwrap, withOwnerId } from "./request";
import type { Contribution, Goal, GoalProgressItem, NewContribution, NewGoal } from "./types";

/** `GET /goals` (RF-F2-08) — `API-CONTRACT.yaml` v0.16.0. */
export async function listGoals(options?: { onlyActive?: boolean }): Promise<Goal[]> {
  let query = getSupabaseClient().from("goals").select("*").order("created_at", { ascending: true });
  if (options?.onlyActive) query = query.eq("is_active", true);
  return unwrap(query);
}

/**
 * `POST /goals` (RF-F2-08 AC1)
 * `user_id` explícito na sessão ativa (defesa em profundidade, Bloqueio 015/`SEC-DEBT-008`).
 */
export async function createGoal(input: NewGoal): Promise<Goal> {
  return unwrap(getSupabaseClient().from("goals").insert(await withOwnerId(input)).select().single());
}

/** `PATCH /goals?id=eq.{id}` — editar meta ou arquivar (`is_active:false`). */
export async function updateGoal(id: string, input: Partial<NewGoal>): Promise<Goal> {
  return unwrap(getSupabaseClient().from("goals").update(input).eq("id", id).select().single());
}

/** `DELETE /goals?id=eq.{id}` — aportes vinculados são removidos em cascata (não é lançamento do ledger). */
export async function deleteGoal(id: string): Promise<void> {
  await unwrap(getSupabaseClient().from("goals").delete().eq("id", id).select());
}

/** `POST /rpc/get_goals_progress` (RF-F2-08 AC1-2) — sempre calculado ao vivo, nunca cacheado no client. */
export async function getGoalsProgress(): Promise<GoalProgressItem[]> {
  return unwrap(getSupabaseClient().rpc("get_goals_progress", {}));
}

/** `GET /contributions?goal_id=eq.{id}&order=contribution_date.desc` (S-GOAL-03/04) */
export async function listContributions(goalId: string): Promise<Contribution[]> {
  return unwrap(
    getSupabaseClient().from("contributions").select("*").eq("goal_id", goalId).order("contribution_date", { ascending: false }),
  );
}

/**
 * `POST /contributions` (RF-F2-08 AC1) — dispara o recálculo de progresso (reconsultar `getGoalsProgress` após).
 * `user_id` explícito na sessão ativa (defesa em profundidade, Bloqueio 015/`SEC-DEBT-008`).
 */
export async function createContribution(input: NewContribution): Promise<Contribution> {
  return unwrap(getSupabaseClient().from("contributions").insert(await withOwnerId(input)).select().single());
}

/** `DELETE /contributions?id=eq.{id}` — progresso é recalculado imediatamente (reconsultar `getGoalsProgress` após). */
export async function deleteContribution(id: string): Promise<void> {
  await unwrap(getSupabaseClient().from("contributions").delete().eq("id", id).select());
}
