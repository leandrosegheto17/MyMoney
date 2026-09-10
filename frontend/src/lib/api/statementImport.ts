import { invokeEdgeFunction } from "./edgeFunctions";

/**
 * Client de `/statement-import` — `API-CONTRACT.yaml` v0.23.0 (`BE-F3-03`),
 * consumido por `StatementImportFlow` (`UX-SPEC.md` S-CAP-06/S-CAP-07,
 * `FE-F3-05`). Não persiste nada — puramente interpretação de arquivo +
 * checagem de duplicata; a lista devolvida (`candidates`) só vira
 * `candidate_transaction` real quando o usuário revisa/seleciona e confirma
 * (`candidateTransactions.ts`, RNF-01/RNF-08/DIR-20).
 */

export type StatementFileFormat = "ofx" | "csv";

export interface StatementImportCandidateRawPayload {
  transaction_date: string;
  amount_cents: number;
  kind: "income" | "expense";
  description?: string | null;
  external_ref?: string | null;
}

/** `NewCandidateTransaction`-shaped, mas ainda não persistido (`BE-F3-03`). */
export interface StatementImportCandidate {
  source: "import";
  raw_payload: StatementImportCandidateRawPayload;
  /** RF-F3-03 AC2 — preenchido quando a Edge Function encontrou um lançamento existente com mesma data+valor na conta informada. */
  duplicate_of_transaction_id: string | null;
}

export interface StatementImportResult {
  candidates: StatementImportCandidate[];
  total_parsed: number;
  skipped_lines: number;
  duplicate_count: number;
}

export interface StatementImportInput {
  fileContentBase64: string;
  fileFormat: StatementFileFormat;
  accountId: string;
}

/**
 * Envia o arquivo OFX/CSV já lido como base64 (`readFileAsDataUrl`/
 * `dataUrlToBase64`, `receiptImage.ts`, mesmo mecanismo genérico já usado por
 * `receiptOcr.ts`) para interpretação. Falha total (400/422/rede) propaga como
 * `ApiError` — cabe ao chamador (`StatementImportFlow`) mostrar o `Banner` de
 * erro literal de `UX-SPEC.md` S-CAP-07 ("Não foi possível ler o arquivo...").
 */
export async function extractStatementImport(input: StatementImportInput): Promise<StatementImportResult> {
  return invokeEdgeFunction<StatementImportResult>("statement-import", {
    file_content_base64: input.fileContentBase64,
    file_format: input.fileFormat,
    account_id: input.accountId,
  });
}
