// BE-F3-01 — Edge Function `receipt-ocr` (RF-F3-02 AC1-3, ADR-007, SPK-002,
// DIR-22). Helpers puros/testáveis, separados de `index.ts` (wiring HTTP) e
// de `googleVisionAdapter.ts` (I/O de rede) para poder rodar `deno test` sem
// chamar a API real do Google Cloud Vision (automated-testing) — mesmo
// espírito de `supabase/functions/backup-export/lib.ts`.
//
// A responsabilidade de parsing (valor/data/estabelecimento/categoria a
// partir do texto bruto) é deste produto, não do vendor — é exatamente por
// isso que SPK-002 escolheu `DOCUMENT_TEXT_DETECTION` (texto bruto) em vez de
// `AnalyzeExpense`/parsing nativo (ver `_shared/ocrProvider.ts` e TASK.md
// Seção 2, SPK-002). Cada heurística abaixo nunca lança por não encontrar um
// campo — retorna `undefined` (RF-F3-02 AC3, "campo obrigatório não extraído
// retorna em branco sem bloquear os demais").

import type { ExtractedField, ReceiptExtractionResult } from "../_shared/ocrProvider.ts";

// ---------------------------------------------------------------------------
// Validação de upload (tamanho/MIME) — feita aqui, antes de chamar o vendor
// (contrato `OCRProvider` explicitamente não faz essa validação).
// ---------------------------------------------------------------------------
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB decodificado
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export interface ImageValidationError {
  ok: false;
  error: "missing_image" | "invalid_mime_type" | "invalid_base64" | "image_too_large";
  message: string;
}

export interface ImageValidationSuccess {
  ok: true;
  bytes: Uint8Array;
}

/** Decodifica base64 padrão (não url-safe — Google Vision espera base64 comum). */
export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Valida `mime_type`/`image_base64` do corpo da requisição antes de chamar o
 *  adapter — nunca lança, sempre retorna um resultado discriminado por `ok`. */
export function validateImageInput(
  mimeType: unknown,
  imageBase64: unknown,
): ImageValidationSuccess | ImageValidationError {
  if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
    return { ok: false, error: "missing_image", message: "image_base64 é obrigatório." };
  }
  if (
    typeof mimeType !== "string" ||
    !(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)
  ) {
    return {
      ok: false,
      error: "invalid_mime_type",
      message: `mime_type deve ser um de: ${ALLOWED_MIME_TYPES.join(", ")}.`,
    };
  }

  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(imageBase64);
  } catch {
    return { ok: false, error: "invalid_base64", message: "image_base64 não é base64 válido." };
  }

  if (bytes.length === 0) {
    return { ok: false, error: "missing_image", message: "image_base64 está vazio." };
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: "image_too_large",
      message: `Imagem excede o tamanho máximo permitido (${MAX_IMAGE_BYTES} bytes).`,
    };
  }

  return { ok: true, bytes };
}

// ---------------------------------------------------------------------------
// Heurísticas de parsing de recibo/cupom fiscal brasileiro (RF-F3-02 AC1/AC3).
// Confiança fixa por heurística (não é confiança nativa do vendor — essa vira
// `overall_confidence`, calculada à parte a partir dos blocos do Google
// Vision, ver `computeOverallConfidence` abaixo).
// ---------------------------------------------------------------------------
const AMOUNT_NEAR_TOTAL_CONFIDENCE = 0.75;
const AMOUNT_FALLBACK_CONFIDENCE = 0.55;
const DATE_CONFIDENCE = 0.8;
const MERCHANT_CONFIDENCE = 0.6;
const CATEGORY_CONFIDENCE = 0.5;

/** Converte "1.234,56" (formato brasileiro) para centavos (123456). */
function brlToCents(raw: string): number {
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  return Math.round(parseFloat(normalized) * 100);
}

const CURRENCY_VALUE_RE = /(\d{1,3}(?:\.\d{3})*,\d{2})/g;

/** RF-F3-02 AC1: valor total do recibo. Prioriza um valor na mesma linha de
 *  uma palavra-chave de total ("total", "valor a pagar", "valor total");
 *  na ausência, cai para o maior valor monetário encontrado no texto inteiro
 *  (heurística comum: o total costuma ser o maior valor de um cupom fiscal).
 *  Retorna `undefined` (nunca lança) se nenhum valor monetário for encontrado. */
export function parseAmountCents(rawText: string): ExtractedField<number> | undefined {
  const lines = rawText.split(/\r?\n/);
  const totalLineRe = /total|valor a pagar/i;

  for (const line of lines) {
    if (!totalLineRe.test(line)) continue;
    const matches = [...line.matchAll(CURRENCY_VALUE_RE)];
    if (matches.length > 0) {
      const cents = brlToCents(matches[matches.length - 1][1]);
      if (Number.isFinite(cents) && cents > 0) {
        return { value: cents, confidence: AMOUNT_NEAR_TOTAL_CONFIDENCE };
      }
    }
  }

  const allMatches = [...rawText.matchAll(CURRENCY_VALUE_RE)];
  if (allMatches.length === 0) return undefined;

  const allCents = allMatches
    .map((m) => brlToCents(m[1]))
    .filter((c) => Number.isFinite(c) && c > 0);
  if (allCents.length === 0) return undefined;

  return { value: Math.max(...allCents), confidence: AMOUNT_FALLBACK_CONFIDENCE };
}

const DATE_RE = /(\d{2})\/(\d{2})\/(\d{2,4})/;

/** RF-F3-02 AC1: data do recibo, normalizada para ISO 8601 `YYYY-MM-DD`. Só
 *  aceita o primeiro padrão `dd/mm/aaaa`(`aa`) que seja uma data de
 *  calendário plausível (dia 1-31, mês 1-12) — datas implausíveis (ex.
 *  "99/99/9999" reconhecido por engano pelo OCR) são tratadas como "não
 *  encontrado", nunca lançam. */
export function parseTransactionDate(rawText: string): ExtractedField<string> | undefined {
  const match = rawText.match(DATE_RE);
  if (!match) return undefined;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);
  if (match[3].length === 2) year += 2000;

  if (day < 1 || day > 31 || month < 1 || month > 12) return undefined;
  if (year < 2000 || year > 2100) return undefined;

  const iso = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${
    day.toString().padStart(2, "0")
  }`;
  return { value: iso, confidence: DATE_CONFIDENCE };
}

const CNPJ_RE = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/;

/** RF-F3-02 AC1: nome do estabelecimento — no formato de cupom fiscal
 *  brasileiro, normalmente aparece nas primeiras linhas do texto reconhecido
 *  (razão social/nome fantasia), antes do CNPJ e dos itens. Pula linhas
 *  vazias, só-numéricas, ou que contenham um CNPJ. */
export function parseMerchantName(rawText: string): ExtractedField<string> | undefined {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines.slice(0, 5)) {
    if (CNPJ_RE.test(line)) continue;
    const letters = line.replace(/[^\p{L}]/gu, "");
    if (letters.length < 3) continue;
    return { value: line.slice(0, 255), confidence: MERCHANT_CONFIDENCE };
  }
  return undefined;
}

const CATEGORY_KEYWORDS: Array<{ label: string; keywords: RegExp }> = [
  { label: "Alimentação", keywords: /restaurante|lanchonete|padaria|pizzaria|churrascaria|hamburgueria/i },
  { label: "Supermercado", keywords: /supermercado|mercado|hortifruti|atacad(ista|ão)/i },
  { label: "Transporte", keywords: /posto de combust|combustível|gasolina|etanol|estacionamento|pedágio/i },
  { label: "Saúde", keywords: /farmácia|drogaria|clínica|hospital/i },
  { label: "Vestuário", keywords: /loja de roupa|calçados|vestuário|moda/i },
];

/** RF-F3-02 AC1: sugestão de categoria como rótulo textual (nunca `category_id`
 *  — ver contrato em `_shared/ocrProvider.ts`), a partir de palavras-chave no
 *  texto reconhecido. Puramente uma sugestão pré-preenchida; casar com uma
 *  categoria real do usuário é responsabilidade de quem chama este contrato. */
export function parseCategorySuggestion(rawText: string): ExtractedField<string> | undefined {
  for (const { label, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.test(rawText)) {
      return { value: label, confidence: CATEGORY_CONFIDENCE };
    }
  }
  return undefined;
}

/** Confiança geral (0-1) a partir dos blocos de `DOCUMENT_TEXT_DETECTION` do
 *  Google Vision (`fullTextAnnotation.pages[].blocks[].confidence`) — só
 *  informativo (RNF-01: nunca usado para pular a confirmação humana).
 *  Retorna `undefined` quando não há blocos com confiança reportada. */
export function computeOverallConfidence(
  blockConfidences: number[],
): number | undefined {
  const valid = blockConfidences.filter((c) => Number.isFinite(c));
  if (valid.length === 0) return undefined;
  const sum = valid.reduce((acc, c) => acc + c, 0);
  return sum / valid.length;
}

/** Monta o `ReceiptExtractionResult` completo (RF-F3-02 AC1/AC3) a partir do
 *  texto bruto reconhecido pelo vendor — nunca lança por causa de um campo
 *  individual ilegível, cada parser acima já garante isso. */
export function buildReceiptExtractionResult(
  rawText: string,
  overallConfidence?: number,
): ReceiptExtractionResult {
  return {
    amount_cents: parseAmountCents(rawText),
    transaction_date: parseTransactionDate(rawText),
    merchant_name: parseMerchantName(rawText),
    category_suggestion_label: parseCategorySuggestion(rawText),
    overall_confidence: overallConfidence,
    raw_text: rawText,
  };
}
