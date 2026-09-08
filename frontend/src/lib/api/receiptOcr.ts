import { invokeEdgeFunction } from "./edgeFunctions";
import type { PreparedReceiptImage } from "../receiptImage";

/**
 * Client de `/receipt-ocr` — `API-CONTRACT.yaml` v0.21.0 (`BE-F3-01`), consumido
 * por `CaptureFab`/`DraftReviewBanner` (`UX-SPEC.md` S-CAP-04/S-CAP-05, `FE-F3-04`).
 * Não persiste nada — puramente extração; o rascunho de confirmação
 * (`candidate_transaction`) é responsabilidade de `candidateTransactions.ts`.
 */

export interface ReceiptExtractedField<T> {
  value: T;
  confidence: number;
}

export interface ReceiptExtractionResult {
  amount_cents?: ReceiptExtractedField<number>;
  transaction_date?: ReceiptExtractedField<string>;
  merchant_name?: ReceiptExtractedField<string>;
  category_suggestion_label?: ReceiptExtractedField<string>;
  overall_confidence?: number;
  raw_text?: string;
}

/**
 * Envia a imagem já preparada/validada (`receiptImage.ts`) para extração de
 * campos. Falha total do vendor (502/503) ou de rede propaga como `ApiError` —
 * cabe ao chamador (`CaptureFab`) decidir abrir o rascunho com todos os campos
 * em branco nesse caso (UX-SPEC S-CAP-04: "OCR falha totalmente → rascunho abre
 * com todos os campos em branco... nunca bloqueia o usuário de lançar").
 */
export async function extractReceiptOcr(image: PreparedReceiptImage): Promise<ReceiptExtractionResult> {
  const response = await invokeEdgeFunction<{ result: ReceiptExtractionResult }>("receipt-ocr", {
    image_base64: image.base64,
    mime_type: image.mimeType,
  });
  return response.result;
}
