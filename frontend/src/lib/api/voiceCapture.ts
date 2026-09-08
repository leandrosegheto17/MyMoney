import { invokeEdgeFunction } from "./edgeFunctions";

/**
 * Client de `/voice-capture` — `API-CONTRACT.yaml` v0.22.0 (`BE-F3-02`),
 * consumido por `VoiceRecorderUI` (`UX-SPEC.md` S-CAP-02, `FE-F3-02`).
 * Não persiste nada — puramente extração; o rascunho de confirmação
 * (`DraftReviewBanner`) que exibe este resultado é escopo de `FE-F3-04`.
 */

export interface VoiceExtractedField<T> {
  value: T;
  confidence: number;
}

export interface VoiceExtractionResult {
  amount_cents: VoiceExtractedField<number> | null;
  transaction_date: VoiceExtractedField<string>;
  type: VoiceExtractedField<"entrada" | "saida"> | null;
  description: VoiceExtractedField<string> | null;
  category_suggestion_label: VoiceExtractedField<string> | null;
  transcript: string;
  /** Sempre "sugestão automática, não confirmada" (RF-F3-01 AC1, texto literal). */
  suggestion_disclaimer: string;
}

/** Envia a transcrição já finalizada pelo client (Web Speech API) para extração de campos. */
export async function extractVoiceCapture(transcript: string): Promise<VoiceExtractionResult> {
  const response = await invokeEdgeFunction<{ result: VoiceExtractionResult }>("voice-capture", { transcript });
  return response.result;
}
