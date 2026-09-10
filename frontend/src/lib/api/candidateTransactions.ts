import { getSupabaseClient } from "../supabase/client";
import { unwrap, withOwnerId } from "./request";
import type { CandidateTransaction, ConfirmCandidateTransactionParams, ImportBatch, NewCandidateTransaction, NewImportBatch } from "./types";

/**
 * Client de `/candidate_transaction`, `/import_batch` e
 * `/rpc/confirm_candidate_transaction`/`/rpc/discard_candidate_transaction` —
 * `API-CONTRACT.yaml` (`BE-F3-00`), consumido por `DraftReviewBanner`
 * (`UX-SPEC.md` S-CAP-03/S-CAP-05, `FE-F3-04`) e por `StatementImportFlow`
 * (`S-CAP-06`/`S-CAP-07`, `FE-F3-05`). RNF-01/RNF-08/DIR-20: nenhuma linha
 * aqui vira `Transaction` sem `confirmCandidateTransaction` explícito.
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

/**
 * `POST /rpc/discard_candidate_transaction` — descarta explicitamente um
 * candidato `pending` sem excluir a linha física (`BE-F3-00`, mantém o
 * registro de auditoria — diferente de `deleteCandidateTransaction`, que
 * remove fisicamente um rascunho de voz/foto cancelado antes de qualquer
 * revisão). Só se aplica a um candidato que já existe como linha `pending`
 * no banco; `StatementImportFlow` (`FE-F3-05`) nunca chama esta função para
 * um item da lista de `/statement-import` que o usuário deixou desmarcado —
 * esses candidatos nunca chegam a ser criados via `createCandidateTransaction`
 * em primeiro lugar (a Edge Function só devolve a lista em memória, não
 * persiste nada, `BE-F3-03`), então não há linha `pending` para descartar.
 */
export async function discardCandidateTransaction(id: string): Promise<void> {
  await unwrap(getSupabaseClient().rpc("discard_candidate_transaction", { p_candidate_id: id }));
}

/**
 * `POST /import_batch` — cria o lote antes de criar os candidatos que o
 * referenciam (`import_batch_id`), sempre `source: "import"` para o fluxo de
 * upload de extrato (`openfinance` fica para `FE-F3-06`). Decisão pequena de
 * implementação (documentada em `TASK.md` `FE-F3-05`): o lote é criado já
 * "pronto" na prática (os candidatos só são conhecidos depois de
 * `/statement-import` responder, ver `statementImport.ts`) — `status` fica no
 * `DEFAULT` da coluna (`processing`) e nenhuma tarefa decomposta até aqui lê
 * esse campo de volta, então não há necessidade de um `PATCH status` extra
 * ao final da confirmação em lote.
 */
export async function createImportBatch(input: NewImportBatch): Promise<ImportBatch> {
  return unwrap(getSupabaseClient().from("import_batch").insert(await withOwnerId(input)).select().single());
}
