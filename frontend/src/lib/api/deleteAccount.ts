import { invokeEdgeFunction } from "./edgeFunctions";

/**
 * Client de `/delete-account` — `API-CONTRACT.yaml` v0.28.0 (`BE-F3-09`, ADR-011,
 * já Concluída — contrato real, não mock), consumido pelo fluxo de exclusão de
 * conta de `SettingsPage` (`FE-F3-09`). Segue o mesmo padrão de
 * `invokeEdgeFunction` já usado por `reportExport.ts`/`receiptOcr.ts`/
 * `voiceCapture.ts` (anexa `Authorization: Bearer <JWT de sessão>`
 * automaticamente a partir do client Supabase autenticado).
 *
 * Corpo sempre vazio — o alvo é sempre o próprio usuário autenticado (o
 * `user_id` opcional do contrato existe só para o caso defensivo de o backend
 * rejeitar um alvo diferente do JWT; o Frontend nunca precisa/deve informá-lo).
 */

export interface DeleteAccountResult {
  ok: boolean;
  deleted_rows: Record<string, unknown>;
  storage_removed_count: number;
  storage_warning: string | null;
}

/** Exclui a conta do usuário autenticado (irreversível, ADR-011) — RF/AC de FE-F3-09. */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  return invokeEdgeFunction<DeleteAccountResult>("delete-account", {});
}
