// BE-F3-02 — testes unitários de `lib.ts` (parsing puro, sem rede).
// Execução: deno test --allow-none supabase/functions/voice-capture/lib.test.ts
//
// Cobertura mínima exigida pela tarefa (RF-F3-01 AC1):
//   (a) transcrição bem-formada extrai valor/data/tipo/categoria/descrição
//       corretamente, com `suggestion_disclaimer` presente (AC1 literal);
//   (b) transcrição sem um dos campos retorna esse campo `undefined` sem
//       lançar e sem afetar os demais;
//   (c) validação de entrada (`transcript` vs. `audio_base64`) nunca lança.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ALLOWED_AUDIO_MIME_TYPES,
  base64ToBytes,
  buildVoiceExtractionResult,
  MAX_TRANSCRIPT_LENGTH,
  parseAmountCentsFromSpeech,
  parseCategorySuggestionFromSpeech,
  parseDescriptionFromSpeech,
  parseTransactionDateFromSpeech,
  parseTransactionTypeFromSpeech,
  SUGGESTION_DISCLAIMER,
  validateVoiceInput,
} from "./lib.ts";

const FIXED_NOW = new Date("2026-09-07T12:00:00Z");

// ---------------------------------------------------------------------------
// (a) Transcrição bem-formada extrai os campos corretamente (AC1).
// ---------------------------------------------------------------------------
Deno.test("buildVoiceExtractionResult extrai valor, data relativa, tipo e categoria (AC1)", () => {
  const result = buildVoiceExtractionResult("gastei 50 reais no mercado hoje", FIXED_NOW);

  assertEquals(result.amount_cents?.value, 5000);
  assertEquals(result.transaction_date?.value, "2026-09-07");
  assertEquals(result.type?.value, "saida");
  assertEquals(result.category_suggestion_label?.value, "Supermercado");
  assertEquals(result.suggestion_disclaimer, SUGGESTION_DISCLAIMER);
  assertEquals(result.transcript, "gastei 50 reais no mercado hoje");
});

Deno.test("parseAmountCentsFromSpeech reconhece símbolo R$ com centavos", () => {
  const field = parseAmountCentsFromSpeech("paguei R$ 45,90 na farmácia");
  assertEquals(field?.value, 4590);
});

Deno.test("parseAmountCentsFromSpeech reconhece 'X reais e Y centavos' em frases separadas por vírgula", () => {
  const field = parseAmountCentsFromSpeech("gastei 30 reais e 50 centavos no posto");
  assertEquals(field?.value, 3050);
});

Deno.test("parseAmountCentsFromSpeech reconhece numeral por extenso 'cinquenta reais'", () => {
  const field = parseAmountCentsFromSpeech("gastei cinquenta reais no restaurante");
  assertEquals(field?.value, 5000);
});

Deno.test("parseAmountCentsFromSpeech reconhece numeral composto 'cento e vinte reais'", () => {
  const field = parseAmountCentsFromSpeech("paguei cento e vinte reais de conta de luz");
  assertEquals(field?.value, 12000);
});

Deno.test("parseAmountCentsFromSpeech reconhece 'dois mil reais'", () => {
  const field = parseAmountCentsFromSpeech("recebi dois mil reais de salário");
  assertEquals(field?.value, 200000);
});

Deno.test("parseTransactionDateFromSpeech reconhece 'ontem' relativo a 'now'", () => {
  const field = parseTransactionDateFromSpeech("paguei 10 reais ontem", FIXED_NOW);
  assertEquals(field.value, "2026-09-06");
});

Deno.test("parseTransactionDateFromSpeech reconhece data explícita dd/mm", () => {
  const field = parseTransactionDateFromSpeech("gastei 10 reais dia 15/03", FIXED_NOW);
  assertEquals(field.value, "2026-03-15");
});

Deno.test("parseTransactionDateFromSpeech reconhece 'dia N' do mês corrente", () => {
  const field = parseTransactionDateFromSpeech("paguei 20 reais no dia 5", FIXED_NOW);
  assertEquals(field.value, "2026-09-05");
});

Deno.test("parseTransactionTypeFromSpeech reconhece verbo de saída ('gastei')", () => {
  assertEquals(parseTransactionTypeFromSpeech("gastei 10 reais")?.value, "saida");
});

Deno.test("parseTransactionTypeFromSpeech reconhece verbo de entrada ('recebi')", () => {
  assertEquals(parseTransactionTypeFromSpeech("recebi 500 reais de reembolso")?.value, "entrada");
});

Deno.test("parseCategorySuggestionFromSpeech sugere rótulo textual a partir de palavra-chave (nunca category_id)", () => {
  assertEquals(parseCategorySuggestionFromSpeech("uber para o aeroporto")?.value, "Transporte");
});

Deno.test("parseDescriptionFromSpeech remove verbo/valor/marcador de tempo, preserva o resto capitalizado", () => {
  const field = parseDescriptionFromSpeech("gastei 50 reais hoje no mercado do bairro");
  assertEquals(field?.value, "No mercado do bairro");
});

// ---------------------------------------------------------------------------
// (b) Campo não reconhecido retorna undefined sem lançar e sem afetar os
// demais campos.
// ---------------------------------------------------------------------------
Deno.test("transcrição sem valor monetário retorna amount_cents undefined sem afetar os demais campos", () => {
  const result = buildVoiceExtractionResult("recebi hoje do trabalho", FIXED_NOW);
  assertEquals(result.amount_cents, undefined);
  assertEquals(result.type?.value, "entrada");
  assertEquals(result.transaction_date?.value, "2026-09-07");
});

Deno.test("transcrição sem verbo de tipo retorna type undefined sem lançar", () => {
  assertEquals(parseTransactionTypeFromSpeech("cinquenta reais no mercado"), undefined);
});

Deno.test("transcrição sem menção de data assume 'hoje' com confiança reduzida (decisão documentada), nunca lança", () => {
  const field = parseTransactionDateFromSpeech("gastei 10 reais no mercado", FIXED_NOW);
  assertEquals(field.value, "2026-09-07");
  assert(field.confidence < 0.5);
});

Deno.test("transcrição sem palavra-chave de categoria retorna category_suggestion_label undefined", () => {
  assertEquals(parseCategorySuggestionFromSpeech("gastei 10 reais com uma coisa qualquer"), undefined);
});

Deno.test("transcrição totalmente vazia não lança e retorna campos estruturados em branco", () => {
  const result = buildVoiceExtractionResult("", FIXED_NOW);
  assertEquals(result.amount_cents, undefined);
  assertEquals(result.type, undefined);
  assertEquals(result.description, undefined);
  assertEquals(result.category_suggestion_label, undefined);
  // Data ainda assume "hoje" mesmo com transcrição vazia — nunca lança.
  assertEquals(result.transaction_date?.value, "2026-09-07");
  assertEquals(result.suggestion_disclaimer, SUGGESTION_DISCLAIMER);
});

Deno.test("data explícita implausível (mês 13) é descartada sem lançar; cai para o padrão 'dia N' do mês corrente quando reconhecível", () => {
  // "15/13" não é uma data de calendário válida (mês 13) — EXPLICIT_DATE_RE
  // descarta esse candidato, mas "dia 15" ainda casa com DAY_OF_MONTH_RE
  // (dia 15 do mês corrente), sem lançar em nenhum passo.
  const field = parseTransactionDateFromSpeech("gastei 10 reais dia 15/13", FIXED_NOW);
  assertEquals(field.value, "2026-09-15");
});

Deno.test("data totalmente implausível (sem 'dia N' reconhecível) cai no default 'hoje', sem lançar", () => {
  const field = parseTransactionDateFromSpeech("gastei 10 reais no dia 99/99", FIXED_NOW);
  assertEquals(field.value, "2026-09-07");
});

// ---------------------------------------------------------------------------
// (c) Validação de entrada (transcript vs. audio_base64) — nunca lança.
// ---------------------------------------------------------------------------
Deno.test("validateVoiceInput aceita transcript não vazio, prioridade sobre audio_base64", () => {
  const result = validateVoiceInput("gastei 10 reais", "AAAA", "audio/webm");
  assert(result.ok);
  if (result.ok) {
    assertEquals(result.source, "client_transcript");
  }
});

Deno.test("validateVoiceInput rejeita transcript maior que MAX_TRANSCRIPT_LENGTH", () => {
  const huge = "a".repeat(MAX_TRANSCRIPT_LENGTH + 1);
  const result = validateVoiceInput(huge, undefined, undefined);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "transcript_too_long");
});

Deno.test("validateVoiceInput cai para audio_base64 quando transcript ausente", () => {
  const b64 = btoa("fake-audio-bytes");
  const result = validateVoiceInput(undefined, b64, "audio/webm");
  assert(result.ok);
  if (result.ok) {
    assertEquals(result.source, "audio_fallback");
  }
});

Deno.test("validateVoiceInput rejeita mime_type fora da lista permitida para audio_base64", () => {
  const b64 = btoa("fake-audio-bytes");
  const result = validateVoiceInput(undefined, b64, "audio/mpeg");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "invalid_mime_type");
});

Deno.test("validateVoiceInput rejeita quando nem transcript nem audio_base64 são enviados", () => {
  const result = validateVoiceInput(undefined, undefined, undefined);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "missing_input");
});

Deno.test("validateVoiceInput rejeita audio_base64 inválido", () => {
  const result = validateVoiceInput(undefined, "not-base64-!!!", ALLOWED_AUDIO_MIME_TYPES[0]);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "invalid_base64");
});

Deno.test("base64ToBytes decodifica corretamente", () => {
  const bytes = base64ToBytes(btoa("abc"));
  assertEquals(new TextDecoder().decode(bytes), "abc");
});
