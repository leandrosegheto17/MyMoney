// BE-F3-01 — adapter Google Cloud Vision para o contrato `OCRProvider`
// (`_shared/ocrProvider.ts`), decidido em SPK-002 (TASK.md Seção 2). Único
// arquivo deste módulo que conhece o formato de resposta nativo do Google
// (`fullTextAnnotation`) — trocar de vendor (condição de reversão para AWS
// Textract já documentada em SPK-002) implica só um novo adapter aqui, sem
// tocar em `lib.ts` (heurísticas do produto) nem em `index.ts` (wiring HTTP).
//
// DIR-30/critério de aceite explícito de BE-F3-01: a chave de API nunca é
// exposta ao cliente — só chega até aqui via `Deno.env.get("GOOGLE_VISION_API_KEY")`
// (injetada em `index.ts`), nunca hardcoded, nunca devolvida em nenhuma resposta.

import type { OCRProvider, ReceiptExtractionResult } from "../_shared/ocrProvider.ts";
import { bytesToBase64, buildReceiptExtractionResult, computeOverallConfidence } from "./lib.ts";

const VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";

// Subconjunto mínimo do formato de resposta do Google Vision necessário para
// este adapter — deliberadamente não tipamos a resposta inteira (SDK nativo),
// mesmo espírito de DIR-22 (nunca vazar o formato do vendor para o resto do
// código, só o essencial fica aqui dentro).
interface VisionBlock {
  confidence?: number;
}
interface VisionPage {
  blocks?: VisionBlock[];
}
interface VisionFullTextAnnotation {
  text?: string;
  pages?: VisionPage[];
}
interface VisionApiError {
  code?: number;
  message?: string;
}
interface VisionAnnotateResponseItem {
  fullTextAnnotation?: VisionFullTextAnnotation;
  error?: VisionApiError;
}
interface VisionAnnotateResponse {
  responses?: VisionAnnotateResponseItem[];
}

export class OCRProviderError extends Error {
  readonly detail?: unknown;

  constructor(message: string, detail?: unknown) {
    super(message);
    this.name = "OCRProviderError";
    this.detail = detail;
  }
}

/** Cria o adapter Google Vision. `fetchImpl` é injetável só para teste — o
 *  chamador real (`index.ts`) nunca precisa passá-lo (usa o `fetch` global). */
export function createGoogleVisionAdapter(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): OCRProvider {
  return {
    async extractReceipt(imageBytes: Uint8Array): Promise<ReceiptExtractionResult> {
      const requestBody = {
        requests: [
          {
            image: { content: bytesToBase64(imageBytes) },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
            imageContext: { languageHints: ["pt"] },
          },
        ],
      };

      let res: Response;
      try {
        res = await fetchImpl(`${VISION_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
      } catch (err) {
        // Falha de rede — só aqui a Promise é rejeitada (RF-F3-02 AC2: "cabe
        // ao chamador decidir como isso vira 'todos os campos em branco, sem
        // persistir nada'", nunca responsabilidade deste contrato).
        throw new OCRProviderError("Falha de rede ao chamar o Google Cloud Vision.", err);
      }

      if (!res.ok) {
        // Cota excedida, chave inválida, etc. — nunca inclui a chave de API
        // na mensagem de erro (poderia vazar em log).
        const bodyText = await res.text().catch(() => "");
        throw new OCRProviderError(
          `Google Cloud Vision retornou HTTP ${res.status}: ${bodyText.slice(0, 500)}`,
        );
      }

      let json: VisionAnnotateResponse;
      try {
        json = await res.json();
      } catch (err) {
        throw new OCRProviderError("Resposta do Google Cloud Vision não é JSON válido.", err);
      }

      const item = json.responses?.[0];
      if (!item) {
        throw new OCRProviderError("Google Cloud Vision retornou resposta vazia.");
      }
      if (item.error) {
        // Ex.: imagem irreconhecível/corrompida, formato não suportado.
        throw new OCRProviderError(
          `Google Cloud Vision reportou erro: ${item.error.message ?? "erro desconhecido"}`,
        );
      }

      const rawText = item.fullTextAnnotation?.text ?? "";
      const blockConfidences = (item.fullTextAnnotation?.pages ?? [])
        .flatMap((page) => page.blocks ?? [])
        .map((block) => block.confidence)
        .filter((c): c is number => typeof c === "number");

      // Texto vazio (nenhum texto reconhecido na imagem) não é erro de
      // chamada — vira resultado com todos os campos em branco (RF-F3-02
      // AC3), nunca uma Promise rejeitada.
      return buildReceiptExtractionResult(rawText, computeOverallConfidence(blockConfidences));
    },
  };
}
