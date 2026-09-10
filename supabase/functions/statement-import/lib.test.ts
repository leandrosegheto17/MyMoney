// BE-F3-03 — testes unitários de `lib.ts` (parsing OFX/CSV puro + detecção
// de duplicata). Execução:
// deno test --allow-none supabase/functions/statement-import/lib.test.ts
//
// Cobertura mínima exigida pela tarefa (RF-F3-03 AC1-3):
//   (a) parsing de um OFX válido;
//   (b) parsing de um CSV válido;
//   (c) arquivo malformado/ilegível — fallback gracioso, sem crash;
//   (d) detecção de duplicata (mesma data/valor/conta de um lançamento real
//       já existente é sinalizada).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  base64ToBytes,
  buildStatementCandidatePayload,
  findDuplicateMatch,
  parseCsv,
  parseOfx,
  parseStatementFile,
  validateStatementImportInput,
  type ExistingTransactionForDuplicateCheck,
} from "./lib.ts";

function toBase64(text: string): string {
  let bin = "";
  for (const byte of new TextEncoder().encode(text)) bin += String.fromCharCode(byte);
  return btoa(bin);
}

// ---------------------------------------------------------------------------
// (a) Parsing de OFX válido (AC1).
// ---------------------------------------------------------------------------
const VALID_OFX = `OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260301120000[-3:GMT]
<TRNAMT>-45.90
<FITID>202603011
<MEMO>PADARIA BOM PAO
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260302090000[-3:GMT]
<TRNAMT>1500.00
<FITID>202603022
<NAME>SALARIO
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

Deno.test("parseOfx interpreta transações de saída e entrada de um OFX bem-formado (AC1)", () => {
  const result = parseOfx(VALID_OFX);
  assertEquals(result.transactions.length, 2);
  assertEquals(result.skipped_lines, 0);

  const [expense, income] = result.transactions;
  assertEquals(expense.transaction_date, "2026-03-01");
  assertEquals(expense.amount_cents, 4590);
  assertEquals(expense.kind, "expense");
  assertEquals(expense.description, "PADARIA BOM PAO");
  assertEquals(expense.external_ref, "202603011");

  assertEquals(income.transaction_date, "2026-03-02");
  assertEquals(income.amount_cents, 150000);
  assertEquals(income.kind, "income");
  assertEquals(income.description, "SALARIO");
});

Deno.test("parseOfx pula bloco STMTTRN sem DTPOSTED/TRNAMT reconhecível, sem lançar (AC3)", () => {
  const withBadBlock = `${VALID_OFX}
<STMTTRN>
<TRNTYPE>DEBIT
<MEMO>SEM DATA NEM VALOR
</STMTTRN>
`;
  const result = parseOfx(withBadBlock);
  assertEquals(result.transactions.length, 2);
  assertEquals(result.skipped_lines, 1);
});

// ---------------------------------------------------------------------------
// (b) Parsing de CSV válido (AC1) — cabeçalho pt-BR, delimitador ";".
// ---------------------------------------------------------------------------
const VALID_CSV_SEMICOLON = `data;descricao;valor
01/03/2026;PADARIA BOM PAO;-45,90
02/03/2026;SALARIO;1500,00
`;

Deno.test("parseCsv interpreta CSV com cabeçalho pt-BR e delimitador ';' (AC1)", () => {
  const result = parseCsv(VALID_CSV_SEMICOLON);
  assertEquals(result.transactions.length, 2);
  assertEquals(result.skipped_lines, 0);

  const [expense, income] = result.transactions;
  assertEquals(expense.transaction_date, "2026-03-01");
  assertEquals(expense.amount_cents, 4590);
  assertEquals(expense.kind, "expense");
  assertEquals(expense.description, "PADARIA BOM PAO");

  assertEquals(income.transaction_date, "2026-03-02");
  assertEquals(income.amount_cents, 150000);
  assertEquals(income.kind, "income");
});

const VALID_CSV_COMMA_ISO = `date,description,amount
2026-03-01,Padaria,-45.90
2026-03-05,Mercado,-120.50
`;

Deno.test("parseCsv interpreta CSV com cabeçalho em inglês, delimitador ',' e data ISO", () => {
  const result = parseCsv(VALID_CSV_COMMA_ISO);
  assertEquals(result.transactions.length, 2);
  assertEquals(result.transactions[0].transaction_date, "2026-03-01");
  assertEquals(result.transactions[0].amount_cents, 4590);
  assertEquals(result.transactions[1].amount_cents, 12050);
});

Deno.test("parseCsv pula linha com data ou valor inválido, sem lançar e sem bloquear as demais (AC3)", () => {
  const csv = `data;descricao;valor
01/03/2026;OK;-10,00
data-invalida;RUIM;-20,00
03/03/2026;OK2;valor-invalido
04/03/2026;OK3;-30,00
`;
  const result = parseCsv(csv);
  assertEquals(result.transactions.length, 2);
  assertEquals(result.skipped_lines, 2);
});

// ---------------------------------------------------------------------------
// (c) Arquivo malformado/ilegível — fallback gracioso, nunca crash (AC3).
// ---------------------------------------------------------------------------
Deno.test("parseOfx retorna lista vazia (não lança) para texto totalmente sem STMTTRN", () => {
  const result = parseOfx("isto nao e um arquivo ofx de verdade\nsó texto solto\n");
  assertEquals(result.transactions, []);
  assertEquals(result.skipped_lines, 0);
});

Deno.test("parseCsv retorna lista vazia (não lança) quando cabeçalho não tem colunas reconhecíveis", () => {
  const result = parseCsv("coluna_a,coluna_b,coluna_c\n1,2,3\n");
  assertEquals(result.transactions, []);
});

Deno.test("parseCsv retorna lista vazia (não lança) para arquivo vazio", () => {
  const result = parseCsv("");
  assertEquals(result.transactions, []);
  assertEquals(result.skipped_lines, 0);
});

Deno.test("parseOfx retorna lista vazia (não lança) para arquivo vazio", () => {
  const result = parseOfx("");
  assertEquals(result.transactions, []);
});

Deno.test("parseStatementFile despacha para o parser correto por formato", () => {
  const ofxResult = parseStatementFile(VALID_OFX, "ofx");
  assertEquals(ofxResult.transactions.length, 2);
  const csvResult = parseStatementFile(VALID_CSV_SEMICOLON, "csv");
  assertEquals(csvResult.transactions.length, 2);
});

// ---------------------------------------------------------------------------
// (d) Detecção de possível duplicata — mesma data/valor/conta de um
// lançamento real já existente é sinalizada (AC2).
// ---------------------------------------------------------------------------
Deno.test("findDuplicateMatch sinaliza candidato com mesma data e valor de um lançamento existente (AC2)", () => {
  const candidate = parseCsv(VALID_CSV_SEMICOLON).transactions[0]; // 2026-03-01, 4590, expense
  const existing: ExistingTransactionForDuplicateCheck[] = [
    { id: "existing-1", transaction_date: "2026-03-01", amount_cents: 4590 },
    { id: "existing-2", transaction_date: "2026-03-10", amount_cents: 9999 },
  ];

  const matchId = findDuplicateMatch(candidate, existing);
  assertEquals(matchId, "existing-1");
});

Deno.test("findDuplicateMatch não sinaliza quando data OU valor diferem", () => {
  const candidate = parseCsv(VALID_CSV_SEMICOLON).transactions[0]; // 2026-03-01, 4590

  const differentDate: ExistingTransactionForDuplicateCheck[] = [
    { id: "x", transaction_date: "2026-03-02", amount_cents: 4590 },
  ];
  assertEquals(findDuplicateMatch(candidate, differentDate), undefined);

  const differentAmount: ExistingTransactionForDuplicateCheck[] = [
    { id: "y", transaction_date: "2026-03-01", amount_cents: 100 },
  ];
  assertEquals(findDuplicateMatch(candidate, differentAmount), undefined);
});

Deno.test("findDuplicateMatch retorna undefined quando não há lançamentos existentes", () => {
  const candidate = parseCsv(VALID_CSV_SEMICOLON).transactions[0];
  assertEquals(findDuplicateMatch(candidate, []), undefined);
});

Deno.test("buildStatementCandidatePayload monta NewCandidateTransaction pronto para POST /candidate_transaction, source=import", () => {
  const candidate = parseCsv(VALID_CSV_SEMICOLON).transactions[0];
  const payload = buildStatementCandidatePayload(candidate, "existing-1");

  assertEquals(payload.source, "import");
  assertEquals(payload.duplicate_of_transaction_id, "existing-1");
  assertEquals(payload.raw_payload.amount_cents, 4590);
  assertEquals(payload.raw_payload.kind, "expense");
});

Deno.test("buildStatementCandidatePayload deixa duplicate_of_transaction_id null quando não há duplicata", () => {
  const candidate = parseCsv(VALID_CSV_SEMICOLON).transactions[0];
  const payload = buildStatementCandidatePayload(candidate, undefined);
  assertEquals(payload.duplicate_of_transaction_id, null);
});

// ---------------------------------------------------------------------------
// Validação de entrada do corpo da requisição — nunca lança, sempre `ok`.
// ---------------------------------------------------------------------------
Deno.test("validateStatementImportInput rejeita file_content_base64 ausente", () => {
  const result = validateStatementImportInput(undefined, "csv", "11111111-1111-1111-1111-111111111111");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "missing_file");
});

Deno.test("validateStatementImportInput rejeita file_format fora de ofx/csv", () => {
  const b64 = toBase64("conteudo");
  const result = validateStatementImportInput(b64, "pdf", "11111111-1111-1111-1111-111111111111");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "invalid_file_format");
});

Deno.test("validateStatementImportInput rejeita account_id ausente", () => {
  const b64 = toBase64("conteudo");
  const result = validateStatementImportInput(b64, "csv", undefined);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "missing_account_id");
});

Deno.test("validateStatementImportInput rejeita account_id que não é uuid", () => {
  const b64 = toBase64("conteudo");
  const result = validateStatementImportInput(b64, "csv", "nao-e-um-uuid");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "invalid_account_id");
});

Deno.test("validateStatementImportInput rejeita base64 inválido", () => {
  const result = validateStatementImportInput("***nao-e-base64***", "csv", "11111111-1111-1111-1111-111111111111");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "invalid_base64");
});

Deno.test("validateStatementImportInput rejeita arquivo maior que MAX_FILE_BYTES", () => {
  const big = "a".repeat(5 * 1024 * 1024 + 1);
  const b64 = toBase64(big);
  const result = validateStatementImportInput(b64, "csv", "11111111-1111-1111-1111-111111111111");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "file_too_large");
});

Deno.test("validateStatementImportInput aceita entrada válida e decodifica o texto do arquivo", () => {
  const b64 = toBase64(VALID_CSV_SEMICOLON);
  const result = validateStatementImportInput(b64, "csv", "11111111-1111-1111-1111-111111111111");
  assert(result.ok);
  if (result.ok) {
    assertEquals(result.format, "csv");
    assertEquals(result.accountId, "11111111-1111-1111-1111-111111111111");
    assert(result.fileText.includes("PADARIA BOM PAO"));
  }
});

Deno.test("base64ToBytes decodifica corretamente (round-trip com toBase64 do teste)", () => {
  const bytes = base64ToBytes(toBase64("olá"));
  const text = new TextDecoder().decode(bytes);
  assertEquals(text, "olá");
});
