// BE-F3-01 — testes unitários de `lib.ts` (parsing puro) e
// `googleVisionAdapter.ts` (com `fetch` injetado, sem chamar a API real).
// Execução: deno test --allow-none supabase/functions/receipt-ocr/lib.test.ts
//
// Cobertura mínima exigida pela tarefa (RF-F3-02 AC1-3):
//   (a) texto de recibo sintético bem-formado extrai os 3 campos corretamente;
//   (b) texto sem um dos campos (ex. sem data reconhecível) retorna esse
//       campo `undefined` sem lançar e sem afetar os demais (AC3, caso central
//       do critério de aceite);
//   (c) falha de rede/API (mock) propaga como erro claro, não como resultado
//       parcial silencioso.

import {
  assert,
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ALLOWED_MIME_TYPES,
  base64ToBytes,
  buildReceiptExtractionResult,
  bytesToBase64,
  computeOverallConfidence,
  parseAmountCents,
  parseCategorySuggestion,
  parseMerchantName,
  parseTransactionDate,
  validateImageInput,
} from "./lib.ts";
import { createGoogleVisionAdapter, OCRProviderError } from "./googleVisionAdapter.ts";

// ---------------------------------------------------------------------------
// (a) Recibo sintético bem-formado — extrai os 3 campos corretamente.
// ---------------------------------------------------------------------------
const WELL_FORMED_RECEIPT = `PADARIA BOM PAO LTDA
CNPJ: 12.345.678/0001-99
Rua das Flores, 123
DATA: 15/03/2026
1 PAO FRANCES         R$ 8,50
1 CAFE                R$ 6,00
TOTAL                 R$ 14,50
`;

Deno.test("buildReceiptExtractionResult extrai valor, data e estabelecimento de um recibo bem-formado (AC1)", () => {
  const result = buildReceiptExtractionResult(WELL_FORMED_RECEIPT);

  assertEquals(result.amount_cents?.value, 1450);
  assertEquals(result.transaction_date?.value, "2026-03-15");
  assertEquals(result.merchant_name?.value, "PADARIA BOM PAO LTDA");
  assertEquals(result.raw_text, WELL_FORMED_RECEIPT);
});

Deno.test("parseAmountCents prioriza o valor na linha de TOTAL sobre outros valores do cupom", () => {
  const field = parseAmountCents(WELL_FORMED_RECEIPT);
  assertEquals(field?.value, 1450);
  assert((field?.confidence ?? 0) > 0 && (field?.confidence ?? 0) <= 1);
});

Deno.test("parseAmountCents cai para o maior valor monetário quando não há linha de TOTAL", () => {
  const text = "ITEM A  R$ 12,00\nITEM B  R$ 45,90\n";
  const field = parseAmountCents(text);
  assertEquals(field?.value, 4590);
});

Deno.test("parseCategorySuggestion sugere rótulo textual a partir de palavra-chave (nunca category_id)", () => {
  const field = parseCategorySuggestion("SUPERMERCADO BOM PRECO\nTOTAL R$ 50,00");
  assertEquals(field?.value, "Supermercado");
});

// ---------------------------------------------------------------------------
// (b) AC3 — campo obrigatório não extraído retorna em branco (undefined) sem
// bloquear os demais.
// ---------------------------------------------------------------------------
const RECEIPT_WITHOUT_DATE = `LANCHONETE DO ZE
CNPJ: 98.765.432/0001-11
TOTAL R$ 23,90
`;

Deno.test("AC3: texto sem data reconhecível retorna transaction_date undefined sem afetar os demais campos", () => {
  const result = buildReceiptExtractionResult(RECEIPT_WITHOUT_DATE);

  assertEquals(result.transaction_date, undefined);
  assertEquals(result.amount_cents?.value, 2390);
  assertEquals(result.merchant_name?.value, "LANCHONETE DO ZE");
});

Deno.test("AC3: texto sem nenhum valor monetário retorna amount_cents undefined sem lançar", () => {
  const text = "ALGUM TEXTO SEM VALOR MONETARIO NENHUM\nDATA: 01/01/2026\n";
  const result = buildReceiptExtractionResult(text);

  assertEquals(result.amount_cents, undefined);
  assertEquals(result.transaction_date?.value, "2026-01-01");
});

Deno.test("AC3: texto totalmente vazio retorna todos os campos opcionais undefined, sem lançar", () => {
  const result = buildReceiptExtractionResult("");

  assertEquals(result.amount_cents, undefined);
  assertEquals(result.transaction_date, undefined);
  assertEquals(result.merchant_name, undefined);
  assertEquals(result.category_suggestion_label, undefined);
  assertEquals(result.raw_text, "");
});

Deno.test("parseTransactionDate rejeita data implausível (mês 13) sem lançar, retorna undefined", () => {
  assertEquals(parseTransactionDate("DATA 15/13/2026"), undefined);
});

Deno.test("parseMerchantName pula linha de CNPJ e linhas só-numéricas", () => {
  const text = "12345\n12.345.678/0001-99\nMERCEARIA CENTRAL\nTOTAL R$ 10,00";
  const field = parseMerchantName(text);
  assertEquals(field?.value, "MERCEARIA CENTRAL");
});

Deno.test("computeOverallConfidence calcula a média dos blocos, undefined se não houver nenhum", () => {
  const avg = computeOverallConfidence([0.9, 0.8, 0.7]);
  assert(avg !== undefined && Math.abs(avg - 0.8) < 1e-9);
  assertEquals(computeOverallConfidence([]), undefined);
});

// ---------------------------------------------------------------------------
// Validação de upload (tamanho/MIME) — falha "em branco", nunca lança.
// ---------------------------------------------------------------------------
Deno.test("validateImageInput rejeita image_base64 ausente", () => {
  const result = validateImageInput("image/jpeg", undefined);
  assertEquals(result.ok, false);
});

Deno.test("validateImageInput rejeita mime_type fora da lista permitida", () => {
  const b64 = bytesToBase64(new Uint8Array([1, 2, 3]));
  const result = validateImageInput("application/pdf", b64);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "invalid_mime_type");
});

Deno.test("validateImageInput aceita MIME permitido com base64 válido", () => {
  const original = new Uint8Array([10, 20, 30, 40]);
  const b64 = bytesToBase64(original);
  const result = validateImageInput(ALLOWED_MIME_TYPES[0], b64);
  assert(result.ok);
  if (result.ok) assertEquals(result.bytes, original);
});

Deno.test("validateImageInput rejeita imagem maior que MAX_IMAGE_BYTES", () => {
  const big = new Uint8Array(8 * 1024 * 1024 + 1);
  const b64 = bytesToBase64(big);
  const result = validateImageInput("image/png", b64);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "image_too_large");
});

Deno.test("base64ToBytes/bytesToBase64 fazem round-trip", () => {
  const original = new Uint8Array([1, 2, 3, 255, 0, 128]);
  assertEquals(base64ToBytes(bytesToBase64(original)), original);
});

// ---------------------------------------------------------------------------
// (c) googleVisionAdapter — falha de rede/API propaga como erro claro, nunca
// resultado parcial silencioso. `fetch` é injetado (sem chamada real).
// ---------------------------------------------------------------------------
Deno.test("googleVisionAdapter: falha de rede (fetch rejeita) propaga como OCRProviderError", async () => {
  const failingFetch: typeof fetch = () => Promise.reject(new Error("network down"));
  const adapter = createGoogleVisionAdapter("fake-key", failingFetch);

  await assertRejects(
    () => adapter.extractReceipt(new Uint8Array([1, 2, 3])),
    OCRProviderError,
  );
});

Deno.test("googleVisionAdapter: HTTP não-2xx (ex. cota excedida/chave inválida) propaga como OCRProviderError", async () => {
  const errorFetch: typeof fetch = () =>
    Promise.resolve(new Response("quota exceeded", { status: 429 }));
  const adapter = createGoogleVisionAdapter("fake-key", errorFetch);

  await assertRejects(
    () => adapter.extractReceipt(new Uint8Array([1, 2, 3])),
    OCRProviderError,
  );
});

Deno.test("googleVisionAdapter: erro reportado dentro do corpo (imagem irreconhecível) propaga como OCRProviderError", async () => {
  const bodyErrorFetch: typeof fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({ responses: [{ error: { code: 3, message: "Bad image data." } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  const adapter = createGoogleVisionAdapter("fake-key", bodyErrorFetch);

  await assertRejects(
    () => adapter.extractReceipt(new Uint8Array([1, 2, 3])),
    OCRProviderError,
  );
});

Deno.test("googleVisionAdapter: sucesso com texto vazio retorna resultado com campos em branco, não lança (AC3)", async () => {
  const emptyTextFetch: typeof fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({ responses: [{ fullTextAnnotation: { text: "" } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  const adapter = createGoogleVisionAdapter("fake-key", emptyTextFetch);

  const result = await adapter.extractReceipt(new Uint8Array([1, 2, 3]));
  assertEquals(result.amount_cents, undefined);
  assertEquals(result.transaction_date, undefined);
  assertEquals(result.raw_text, "");
});

Deno.test("googleVisionAdapter: sucesso com texto reconhecido extrai campos via lib.ts e calcula overall_confidence", async () => {
  const successFetch: typeof fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          responses: [
            {
              fullTextAnnotation: {
                text: WELL_FORMED_RECEIPT,
                pages: [{ blocks: [{ confidence: 0.9 }, { confidence: 0.8 }] }],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  const adapter = createGoogleVisionAdapter("fake-key", successFetch);

  const result = await adapter.extractReceipt(new Uint8Array([1, 2, 3]));
  assertEquals(result.amount_cents?.value, 1450);
  assert(Math.abs((result.overall_confidence ?? 0) - 0.85) < 1e-9);
});
