// report-export/pdf.test.ts — BE-F3-07 (RF-F3-06 AC2). `pdf-lib` comprime os
// content streams do PDF com `FlateDecode` (zlib/RFC 1950) por padrão, e
// desenha texto via strings hexadecimais PDF (`<48...> Tj`, WinAnsiEncoding)
// — para confirmar, sem depender de um parser de PDF/renderer completo, que
// o arquivo gerado contém literalmente os textos de resumo do período
// exigidos pelo AC2, este teste: (1) recarrega os bytes gerados com
// `PDFDocument.load` (o próprio `pdf-lib`, não um parser paralelo); (2)
// itera os objetos indiretos brutos (`context.enumerateIndirectObjects()`)
// e descomprime cada `PDFRawStream.contents` via `DecompressionStream`
// (formato zlib, nativo do runtime Deno); (3) extrai as strings
// hexadecimais dentro dos operadores `Tj`/`TJ` e as decodifica byte a byte
// (WinAnsiEncoding coincide com Latin-1/ISO-8859-1 para os acentos comuns
// do pt-BR usados aqui — á/é/í/ó/ú/ã/õ/ç).

import { assert, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { PDFDocument } from "npm:pdf-lib@1.17.1";
import { computeReportSummary } from "./lib.ts";
import { buildReportPdfBytes } from "./pdf.ts";

function bytesToLatin1(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += String.fromCharCode(byte);
  return out;
}

async function inflateZlib(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

function decodeHexTjStrings(contentStreamText: string): string {
  const hexStringRe = /<([0-9A-Fa-f]+)>/g;
  const decoded: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = hexStringRe.exec(contentStreamText)) !== null) {
    const hex = match[1];
    let text = "";
    for (let i = 0; i < hex.length; i += 2) {
      text += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
    decoded.push(text);
  }
  return decoded.join(" ");
}

/** Recarrega o PDF gerado (via o próprio `pdf-lib`), descomprime todo
 *  `PDFRawStream` (content streams das páginas) e devolve o texto desenhado
 *  (`Tj`) já decodificado — pronto para asserções por `assertMatch`. */
async function extractDrawnText(bytes: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(bytes);
  const chunks: string[] = [];
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    const rawContents: unknown = (obj as { contents?: unknown }).contents;
    if (!(rawContents instanceof Uint8Array)) continue;
    let inflated: Uint8Array;
    try {
      inflated = await inflateZlib(rawContents);
    } catch {
      inflated = rawContents;
    }
    chunks.push(decodeHexTjStrings(bytesToLatin1(inflated)));
  }
  return chunks.join(" ");
}

Deno.test("buildReportPdfBytes gera um arquivo PDF válido (assinatura %PDF)", async () => {
  const summary = computeReportSummary([]);
  const bytes = await buildReportPdfBytes(summary, "2026-08-01", "2026-08-31");
  const text = bytesToLatin1(bytes.slice(0, 8));
  assertMatch(text, /^%PDF-/);
  assert(bytes.length > 0);
});

Deno.test("buildReportPdfBytes inclui saldo/entradas/saídas do resumo do período (AC2)", async () => {
  const summary = computeReportSummary([
    { transaction_date: "2026-08-05", account_name: "Conta Corrente", payment_method_name: "Pix", category_name: "Salário", subcategory_name: null, description: null, kind: "income", amount_cents: 300000 },
    { transaction_date: "2026-08-10", account_name: "Conta Corrente", payment_method_name: "Pix", category_name: "Alimentação", subcategory_name: null, description: null, kind: "expense", amount_cents: 45000 },
  ]);
  const bytes = await buildReportPdfBytes(summary, "2026-08-01", "2026-08-31");
  const text = await extractDrawnText(bytes);

  assertMatch(text, /Relat.rio do per.odo/);
  assertMatch(text, /Resumo/);
  assertMatch(text, /Saldo do per.odo: R\$ 2\.550,00/); // 3.000,00 - 450,00
  assertMatch(text, /Entradas: R\$ 3\.000,00/);
  assertMatch(text, /Sa.das: -R\$ 450,00/);
});

Deno.test("buildReportPdfBytes inclui a distribuição por categoria (AC2)", async () => {
  const summary = computeReportSummary([
    { transaction_date: "2026-08-05", account_name: "Conta Corrente", payment_method_name: "Pix", category_name: "Transporte", subcategory_name: null, description: null, kind: "expense", amount_cents: 12000 },
  ]);
  const bytes = await buildReportPdfBytes(summary, "2026-08-01", "2026-08-31");
  const text = await extractDrawnText(bytes);
  assertMatch(text, /Distribui..o por categoria/);
  assertMatch(text, /Transporte \(Sa.da\): -?R\$ 120,00/);
});

Deno.test("buildReportPdfBytes trata período sem nenhuma transação com nota explícita, nunca lança", async () => {
  const summary = computeReportSummary([]);
  const bytes = await buildReportPdfBytes(summary, "2026-08-01", "2026-08-31");
  const text = await extractDrawnText(bytes);
  assertMatch(text, /Nenhuma transa..o no per.odo/);
});
