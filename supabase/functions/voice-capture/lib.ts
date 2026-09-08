// BE-F3-02 — Edge Function `voice-capture` (RF-F3-01 AC1, ADR-006). Helpers
// puros/testáveis, separados de `index.ts` (wiring HTTP) — mesmo espírito de
// `supabase/functions/receipt-ocr/lib.ts` (BE-F3-01, precedente mais
// próximo).
//
// Recebe a transcrição já produzida pelo client via Web Speech API (camada
// obrigatória de ADR-006) e/ou aciona um fallback de STT em nuvem (extensão
// futura, ver `_shared/sttProvider.ts`) — este arquivo cuida só da extração
// de campos estruturados a partir do TEXTO já transcrito, agnóstico de qual
// das duas origens produziu o texto.
//
// RF-F3-01 AC1: "o sistema deve interpretar a fala e pré-preencher o
// formulário de lançamento ... com os valores extraídos, marcados como
// 'sugestão automática, não confirmada'". Cada heurística abaixo nunca lança
// por não encontrar um campo — retorna `undefined` (mesmo padrão de AC3 de
// RF-F3-02/BE-F3-01, aplicado aqui por consistência de produto ainda que o
// AC literal desta tarefa seja o AC1 de RF-F3-01).

import type { ExtractedField } from "../_shared/ocrProvider.ts";

/** Texto literal exigido por RF-F3-01 AC1 — devolvido junto do resultado para
 *  deixar inequívoco (além da semântica já implícita de `ExtractedField`/
 *  `AutoFillTag`/fluxo de `candidate_transaction`) que nenhum campo abaixo é
 *  tratado como confirmado. */
export const SUGGESTION_DISCLAIMER = "sugestão automática, não confirmada";

export const MAX_TRANSCRIPT_LENGTH = 2000;

// ---------------------------------------------------------------------------
// Validação de entrada — transcrição do client (prioritária, ADR-006) ou
// áudio para fallback em nuvem (ainda sem vendor configurado, ver
// `_shared/sttProvider.ts`). Nunca lança, sempre retorna resultado
// discriminado por `ok`.
// ---------------------------------------------------------------------------
export const MAX_AUDIO_BYTES = 8 * 1024 * 1024; // 8MB decodificado, mesmo limite de receipt-ocr
export const ALLOWED_AUDIO_MIME_TYPES = ["audio/webm", "audio/ogg", "audio/wav", "audio/mp4"] as const;

export interface VoiceInputValidationError {
  ok: false;
  error: "missing_input" | "transcript_too_long" | "invalid_mime_type" | "invalid_base64" | "audio_too_large";
  message: string;
}

export type VoiceInputSource =
  | { ok: true; source: "client_transcript"; transcript: string }
  | { ok: true; source: "audio_fallback"; bytes: Uint8Array; mimeType: string };

/** Decodifica base64 padrão (mesmo helper de `receipt-ocr/lib.ts`, duplicado
 *  aqui deliberadamente — cada Edge Function é um deploy isolado, sem módulo
 *  compartilhado de baixo nível entre elas neste projeto). */
export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Valida `transcript`/`audio_base64`/`mime_type` do corpo da requisição.
 *  Transcrição do client (Web Speech API) tem prioridade sobre áudio de
 *  fallback quando ambos chegam — evita acionar STT em nuvem
 *  desnecessariamente quando o client já transcreveu com sucesso. */
export function validateVoiceInput(
  transcript: unknown,
  audioBase64: unknown,
  mimeType: unknown,
): VoiceInputSource | VoiceInputValidationError {
  if (typeof transcript === "string" && transcript.trim().length > 0) {
    const trimmed = transcript.trim();
    if (trimmed.length > MAX_TRANSCRIPT_LENGTH) {
      return {
        ok: false,
        error: "transcript_too_long",
        message: `transcript excede o tamanho máximo permitido (${MAX_TRANSCRIPT_LENGTH} caracteres).`,
      };
    }
    return { ok: true, source: "client_transcript", transcript: trimmed };
  }

  if (typeof audioBase64 === "string" && audioBase64.length > 0) {
    if (
      typeof mimeType !== "string" ||
      !(ALLOWED_AUDIO_MIME_TYPES as readonly string[]).includes(mimeType)
    ) {
      return {
        ok: false,
        error: "invalid_mime_type",
        message: `mime_type deve ser um de: ${ALLOWED_AUDIO_MIME_TYPES.join(", ")}.`,
      };
    }

    let bytes: Uint8Array;
    try {
      bytes = base64ToBytes(audioBase64);
    } catch {
      return { ok: false, error: "invalid_base64", message: "audio_base64 não é base64 válido." };
    }

    if (bytes.length === 0) {
      return { ok: false, error: "missing_input", message: "audio_base64 está vazio." };
    }
    if (bytes.length > MAX_AUDIO_BYTES) {
      return {
        ok: false,
        error: "audio_too_large",
        message: `Áudio excede o tamanho máximo permitido (${MAX_AUDIO_BYTES} bytes).`,
      };
    }

    return { ok: true, source: "audio_fallback", bytes, mimeType };
  }

  return {
    ok: false,
    error: "missing_input",
    message: "Envie transcript (Web Speech API) ou audio_base64 + mime_type (fallback em nuvem).",
  };
}

// ---------------------------------------------------------------------------
// Heurísticas de parsing de linguagem natural em pt-BR (RF-F3-01 AC1).
// Confiança fixa por heurística — mesmo padrão de receipt-ocr/lib.ts.
// ---------------------------------------------------------------------------
const AMOUNT_SYMBOL_CONFIDENCE = 0.85;
const AMOUNT_NUMERIC_REAIS_CONFIDENCE = 0.8;
const AMOUNT_WORDS_CONFIDENCE = 0.6;
const DATE_EXPLICIT_CONFIDENCE = 0.8;
const DATE_RELATIVE_CONFIDENCE = 0.75;
const DATE_DEFAULT_TODAY_CONFIDENCE = 0.4;
const TYPE_CONFIDENCE = 0.65;
const CATEGORY_CONFIDENCE = 0.5;
const DESCRIPTION_CONFIDENCE = 0.4;

/** "1.234,56" ou "50,00" ou "50.00" ou "50" (já sem símbolo/sufixo) para
 *  centavos inteiros. Nunca lança — chamador garante que `raw` já é um
 *  candidato numérico plausível (resultado de regex). */
function brlTokenToCents(raw: string): number {
  if (raw.includes(",")) {
    const [intPart, centPart = ""] = raw.split(",");
    const intClean = intPart.replace(/\./g, "");
    const cents = (centPart + "00").slice(0, 2);
    return parseInt(intClean, 10) * 100 + parseInt(cents || "0", 10);
  }
  if (raw.includes(".")) {
    const parts = raw.split(".");
    const last = parts[parts.length - 1];
    if (last.length === 2) {
      const intClean = parts.slice(0, -1).join("");
      return parseInt(intClean, 10) * 100 + parseInt(last, 10);
    }
    return parseInt(raw.replace(/\./g, ""), 10) * 100;
  }
  return parseInt(raw, 10) * 100;
}

const CURRENCY_SYMBOL_RE = /r\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i;
const REAIS_NUMERIC_RE = /(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*reais?\b/i;
const CENTAVOS_NUMERIC_RE = /(\d{1,2})\s*centavos?\b/i;

// Numerais cardinais em pt-BR usados em valores falados (unidades a
// centenas + "mil"). Conectores ("e") são ignorados na tokenização.
const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  três: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  catorze: 14,
  quatorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100,
  cento: 100,
  duzentos: 200,
  duzentas: 200,
  trezentos: 300,
  trezentas: 300,
  quatrocentos: 400,
  quatrocentas: 400,
  quinhentos: 500,
  quinhentas: 500,
  seiscentos: 600,
  seiscentas: 600,
  setecentos: 700,
  setecentas: 700,
  oitocentos: 800,
  oitocentas: 800,
  novecentos: 900,
  novecentas: 900,
};

/** Soma tokens numéricos em pt-BR (unidades/dezenas/centenas + "mil"),
 *  ignorando conectores. Cobertura suficiente para valores falados de
 *  compras do dia a dia (ex. "cento e vinte", "dois mil e trezentos") — não
 *  cobre milhões nem frações não usuais, aceitável para este produto
 *  (desvio pequeno, documentado). Retorna `undefined` se nenhum token
 *  numérico for reconhecido. */
function wordsToNumber(tokens: string[]): number | undefined {
  let total = 0;
  let current = 0;
  let matchedAny = false;

  for (const token of tokens) {
    if (token === "mil") {
      matchedAny = true;
      current = current === 0 ? 1 : current;
      total += current * 1000;
      current = 0;
      continue;
    }
    const value = NUMBER_WORDS[token];
    if (value === undefined) continue;
    matchedAny = true;
    current += value;
  }
  total += current;
  return matchedAny ? total : undefined;
}

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zà-ú]+/i)
    .filter((w) => w.length > 0);
}

/** Procura a primeira ocorrência de `keyword` na lista de palavras e junta os
 *  tokens numéricos contíguos imediatamente antes dela (parando no primeiro
 *  token que não seja numeral nem conector "e"). */
function numberWordsBeforeKeyword(words: string[], keyword: RegExp): number | undefined {
  const keywordIndex = words.findIndex((w) => keyword.test(w));
  if (keywordIndex <= 0) return undefined;

  const collected: string[] = [];
  for (let i = keywordIndex - 1; i >= 0; i--) {
    const word = words[i];
    if (word === "e" || word === "mil" || NUMBER_WORDS[word] !== undefined) {
      collected.unshift(word);
      continue;
    }
    break;
  }
  return wordsToNumber(collected.filter((w) => w !== "e"));
}

/** RF-F3-01 AC1: valor do lançamento a partir da fala transcrita. Tenta,
 *  nessa ordem: símbolo `R$`, número seguido de "reais" (+ "centavos"
 *  opcional em frase separada), e por fim numerais por extenso próximos de
 *  "reais"/"real". Nunca lança — retorna `undefined` se nada for
 *  reconhecido (campo fica em branco no formulário de confirmação). */
export function parseAmountCentsFromSpeech(text: string): ExtractedField<number> | undefined {
  const symbolMatch = text.match(CURRENCY_SYMBOL_RE);
  if (symbolMatch) {
    const cents = brlTokenToCents(symbolMatch[1]);
    if (Number.isFinite(cents) && cents > 0) {
      return { value: cents, confidence: AMOUNT_SYMBOL_CONFIDENCE };
    }
  }

  const reaisMatch = text.match(REAIS_NUMERIC_RE);
  if (reaisMatch) {
    let cents = brlTokenToCents(reaisMatch[1]);
    const hasOwnDecimal = reaisMatch[1].includes(",") || reaisMatch[1].includes(".");
    if (!hasOwnDecimal) {
      const centavosMatch = text.match(CENTAVOS_NUMERIC_RE);
      if (centavosMatch) cents += parseInt(centavosMatch[1], 10);
    }
    if (Number.isFinite(cents) && cents > 0) {
      return { value: cents, confidence: AMOUNT_NUMERIC_REAIS_CONFIDENCE };
    }
  }

  const words = normalizeWords(text);
  const reaisWords = numberWordsBeforeKeyword(words, /^reais?$/);
  if (reaisWords !== undefined && reaisWords > 0) {
    let cents = reaisWords * 100;
    const centavosWords = numberWordsBeforeKeyword(words, /^centavos?$/);
    if (centavosWords !== undefined && centavosWords > 0 && centavosWords < 100) {
      cents += centavosWords;
    }
    return { value: cents, confidence: AMOUNT_WORDS_CONFIDENCE };
  }

  return undefined;
}

const EXPLICIT_DATE_RE = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/;
const DAY_OF_MONTH_RE = /\bdia\s+(\d{1,2})\b/i;

function isoDate(year: number, month: number, day: number): string | undefined {
  if (day < 1 || day > 31 || month < 1 || month > 12) return undefined;
  const iso = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${
    day.toString().padStart(2, "0")
  }`;
  // Valida data de calendário plausível (ex. rejeita 31/02) revertendo pela
  // própria API de Date, mesmo espírito de receipt-ocr/lib.ts.
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return undefined;
  }
  return iso;
}

/** RF-F3-01 AC1: data do lançamento a partir da fala transcrita, normalizada
 *  para ISO 8601 `YYYY-MM-DD`. Reconhece "hoje"/"ontem"/"anteontem", data
 *  explícita `dd/mm`(`/aaaa`), e "dia N" (dia N do mês corrente). Na
 *  ausência de qualquer menção, assume "hoje" com confiança reduzida — a
 *  captura por voz é, na prática esmagadora dos casos, sobre um gasto que
 *  acabou de acontecer (decisão de interpretação pequena, documentada aqui;
 *  nunca bloqueia o campo, sempre editável antes de confirmar, RF-F3-01
 *  AC3). `now` é injetável só para teste determinístico. */
export function parseTransactionDateFromSpeech(
  text: string,
  now: Date = new Date(),
): ExtractedField<string> {
  const lower = text.toLowerCase();

  if (/\banteontem\b/.test(lower)) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - 2);
    return { value: d.toISOString().slice(0, 10), confidence: DATE_RELATIVE_CONFIDENCE };
  }
  if (/\bontem\b/.test(lower)) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - 1);
    return { value: d.toISOString().slice(0, 10), confidence: DATE_RELATIVE_CONFIDENCE };
  }
  if (/\bhoje\b/.test(lower)) {
    return { value: now.toISOString().slice(0, 10), confidence: DATE_RELATIVE_CONFIDENCE };
  }

  const explicit = lower.match(EXPLICIT_DATE_RE);
  if (explicit) {
    const day = parseInt(explicit[1], 10);
    const month = parseInt(explicit[2], 10);
    let year = explicit[3] ? parseInt(explicit[3], 10) : now.getUTCFullYear();
    if (explicit[3] && explicit[3].length === 2) year += 2000;
    const iso = isoDate(year, month, day);
    if (iso) return { value: iso, confidence: DATE_EXPLICIT_CONFIDENCE };
  }

  const dayOfMonth = lower.match(DAY_OF_MONTH_RE);
  if (dayOfMonth) {
    const day = parseInt(dayOfMonth[1], 10);
    const iso = isoDate(now.getUTCFullYear(), now.getUTCMonth() + 1, day);
    if (iso) return { value: iso, confidence: DATE_EXPLICIT_CONFIDENCE };
  }

  return { value: now.toISOString().slice(0, 10), confidence: DATE_DEFAULT_TODAY_CONFIDENCE };
}

const SAIDA_RE = /\b(gastei|paguei|comprei|gasto de|saída de|saida de|débito de|debito de)\b/i;
const ENTRADA_RE = /\b(recebi|ganhei|entrou|depositaram|caiu na conta|caiu na minha conta)\b/i;

/** RF-F3-01 AC1: tipo do lançamento (entrada/saída) a partir de verbos comuns
 *  de captura por voz. Retorna `undefined` (nunca lança) quando nenhum verbo
 *  é reconhecido — o formulário de confirmação decide um padrão de UI para
 *  esse caso, fora do escopo desta Edge Function. */
export function parseTransactionTypeFromSpeech(
  text: string,
): ExtractedField<"entrada" | "saida"> | undefined {
  if (SAIDA_RE.test(text)) return { value: "saida", confidence: TYPE_CONFIDENCE };
  if (ENTRADA_RE.test(text)) return { value: "entrada", confidence: TYPE_CONFIDENCE };
  return undefined;
}

const CATEGORY_KEYWORDS: Array<{ label: string; keywords: RegExp }> = [
  { label: "Alimentação", keywords: /restaurante|lanchonete|padaria|pizzaria|churrascaria|hamburgueria|ifood|rappi|lanche|almoço|almoco|jantar/i },
  { label: "Supermercado", keywords: /supermercado|mercado|hortifruti|atacad(ista|ão)/i },
  { label: "Transporte", keywords: /uber|99|taxi|táxi|posto de combust|combustível|combustivel|gasolina|etanol|estacionamento|pedágio|pedagio|ônibus|onibus|metrô|metro/i },
  { label: "Saúde", keywords: /farmácia|farmacia|drogaria|clínica|clinica|hospital|remédio|remedio/i },
  { label: "Vestuário", keywords: /loja de roupa|calçados|calcados|vestuário|vestuario|moda/i },
  { label: "Lazer", keywords: /cinema|show|ingresso|streaming|netflix|spotify/i },
];

/** RF-F3-01 AC1: sugestão de categoria como rótulo textual (nunca
 *  `category_id`, mesma decisão de `_shared/ocrProvider.ts`/receipt-ocr). */
export function parseCategorySuggestionFromSpeech(text: string): ExtractedField<string> | undefined {
  for (const { label, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.test(text)) return { value: label, confidence: CATEGORY_CONFIDENCE };
  }
  return undefined;
}

// Fragmentos removidos da transcrição para sugerir uma descrição mais limpa
// (nunca alteram o `transcript` bruto devolvido ao chamador, só a sugestão
// de `description`).
const DESCRIPTION_NOISE_RE =
  /\b(gastei|paguei|comprei|recebi|ganhei|entrou|depositaram|hoje|ontem|anteontem|reais?|centavos?|r\$)\b/gi;

/** RF-F3-01 AC1: sugestão de descrição livre — a transcrição bruta, com
 *  verbos/valores/marcadores de tempo removidos para não duplicar
 *  informação já extraída nos campos estruturados acima. Puramente uma
 *  sugestão pré-preenchida (nunca persistida sem confirmação, RF-F3-01
 *  AC2) — o usuário sempre pode editar livremente antes de confirmar. */
export function parseDescriptionFromSpeech(text: string): ExtractedField<string> | undefined {
  const cleaned = text
    .replace(CURRENCY_SYMBOL_RE, " ")
    .replace(REAIS_NUMERIC_RE, " ")
    .replace(CENTAVOS_NUMERIC_RE, " ")
    .replace(DESCRIPTION_NOISE_RE, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length === 0) return undefined;

  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return { value: capitalized.slice(0, 255), confidence: DESCRIPTION_CONFIDENCE };
}

export interface VoiceExtractionResult {
  amount_cents?: ExtractedField<number>;
  transaction_date?: ExtractedField<string>;
  type?: ExtractedField<"entrada" | "saida">;
  description?: ExtractedField<string>;
  category_suggestion_label?: ExtractedField<string>;
  /** Transcrição bruta usada para a extração (do client via Web Speech API,
   *  ou produzida pelo fallback em nuvem quando configurado). */
  transcript: string;
  /** RF-F3-01 AC1, texto literal — ver `SUGGESTION_DISCLAIMER`. */
  suggestion_disclaimer: string;
}

/** Monta o `VoiceExtractionResult` completo (RF-F3-01 AC1) a partir da
 *  transcrição — nunca lança por causa de um campo individual não
 *  reconhecido, cada parser acima já garante isso. `now` é injetável só
 *  para teste determinístico do parser de data. */
export function buildVoiceExtractionResult(transcript: string, now: Date = new Date()): VoiceExtractionResult {
  return {
    amount_cents: parseAmountCentsFromSpeech(transcript),
    transaction_date: parseTransactionDateFromSpeech(transcript, now),
    type: parseTransactionTypeFromSpeech(transcript),
    description: parseDescriptionFromSpeech(transcript),
    category_suggestion_label: parseCategorySuggestionFromSpeech(transcript),
    transcript,
    suggestion_disclaimer: SUGGESTION_DISCLAIMER,
  };
}
