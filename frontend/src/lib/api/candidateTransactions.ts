import { getSupabaseClient } from "../supabase/client";
import { unwrap, withOwnerId } from "./request";
import type { CandidateTransaction, ConfirmCandidateTransactionParams, NewCandidateTransaction } from "./types";

/**
 * Client de `/candidate_transaction` e `/rpc/confirm_candidate_transaction` —
 * `API-CONTRACT.yaml` (`BE-F3-00`), consumido por `DraftReviewBanner`
 * (`UX-SPEC.md` S-CAP-03/S-CAP-05, `FE-F3-04`). RNF-01/RNF-08/DIR-20: nenhuma
 * linha aqui vira `Transaction` sem `confirmCandidateTransaction` explícito.
 */

/**
 * `POST /candidate_transaction` — cria o rascunho pendente assim que voz/foto
 * termina de extrair (antes de qualquer edição do usuário). `raw_payload` guarda
 * o resultado bruto da extração (`VoiceExtractionResult`/`ReceiptExtractionResult`),
 * nunca usado diretamente para persistir a `Transaction` — só os valores finais
 * enviados a `confirmCandidateTransaction` fazem isso (RF-F3-01 AC3).
 */
export async function createCandidateTransaction(input: NewCandidateTransaction): Promise<CandidateTransaction> {
  return unwrap(getSupabaseClient().from("candidate_transaction").insert(await withOwnerId(input)).select().single());
}

/**
 * `DELETE /candidate_transaction?id=eq.{id}` — cancelar a captura de voz/foto
 * antes de confirmar (RF-F3-01 AC4, `S-CAP-03`/`S-CAP-05` "Cancelar"). Só afeta
 * linha ainda `pending` (policy de DELETE); exclusão física, não `discarded`
 * (esse caminho é `discard_candidate_transaction`, usado pela lista de
 * importação de `FE-F3-05`, fora de escopo aqui). Sem `ConfirmationDialog`: a
 * própria `UX-SPEC.md` (S-CAP-03/05) documenta essa ação como "sem confirmação
 * adicional" — nada foi persistido como lançamento real, só o rascunho.
 */
export async function deleteCandidateTransaction(id: string): Promise<void> {
  await unwrap(getSupabaseClient().from("candidate_transaction").delete().eq("id", id).select());
}

/**
 * `POST /rpc/confirm_candidate_transaction` — ÚNICO caminho para promover o
 * candidato a `Transaction` real (RNF-01/RNF-08, DIR-20). Retorna o `id` (uuid)
 * da `Transaction` criada.
 */
export async function confirmCandidateTransaction(params: ConfirmCandidateTransactionParams): Promise<string> {
  return unwrap(getSupabaseClient().rpc("confirm_candidate_transaction", params));
}
