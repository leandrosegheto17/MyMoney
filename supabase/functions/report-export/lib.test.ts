// report-export/lib.test.ts — BE-F3-07 (RF-F3-06 AC1-2). Mesmo padrão
// (`deno test`, casos de sucesso e de borda, sem mock de rede real) já
// usado por `receipt-ocr`/`voice-capture`/`statement-import`.

import { assertEquals, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildCsvContent,
  computeReportSummary,
  formatCentsToBrl,
  formatDateBr,
  kindLabel,
  signedAmountCents,
  validateReportExportInput,
  type ReportExportRow,
} from "./lib.ts";

function row(overrides: Partial<ReportExportRow> = {}): ReportExportRow {
  return {
    transaction_date: "2026-08-15",
    account_name: "Conta Corrente",
    payment_method_name: "Pix",
    category_name: "Alimentação",
    subcategory_name: null,
    description: "Mercado",
    kind: "expense",
    amount_cents: 4500,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// validateReportExportInput
// ---------------------------------------------------------------------------

Deno.test("validateReportExportInput aceita entrada válida", () => {
  const result = validateReportExportInput("2026-08-01", "2026-08-31", "csv");
  assertEquals(result, { ok: true, startDate: "2026-08-01", endDate: "2026-08-31", format: "csv" });
});

Deno.test("validateReportExportInput rejeita start_date ausente", () => {
  const result = validateReportExportInput(undefined, "2026-08-31", "csv");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "missing_start_date");
});

Deno.test("validateReportExportInput rejeita end_date ausente", () => {
  const result = validateReportExportInput("2026-08-01", undefined, "csv");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "missing_end_date");
});

Deno.test("validateReportExportInput rejeita start_date com formato inválido", () => {
  const result = validateReportExportInput("01/08/2026", "2026-08-31", "csv");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "invalid_start_date");
});

Deno.test("validateReportExportInput rejeita data de calendário implausível (mês 13)", () => {
  const result = validateReportExportInput("2026-13-01", "2026-08-31", "csv");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "invalid_start_date");
});

Deno.test("validateReportExportInput rejeita end_date com formato inválido", () => {
  const result = validateReportExportInput("2026-08-01", "31/08/2026", "csv");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "invalid_end_date");
});

Deno.test("validateReportExportInput rejeita start_date posterior a end_date", () => {
  const result = validateReportExportInput("2026-08-31", "2026-08-01", "csv");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "invalid_date_range");
});

Deno.test("validateReportExportInput aceita start_date igual a end_date (1 dia)", () => {
  const result = validateReportExportInput("2026-08-15", "2026-08-15", "pdf");
  assertEquals(result.ok, true);
});

Deno.test("validateReportExportInput rejeita format fora de csv/pdf", () => {
  const result = validateReportExportInput("2026-08-01", "2026-08-31", "xlsx");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "invalid_format");
});

Deno.test("validateReportExportInput rejeita format ausente", () => {
  const result = validateReportExportInput("2026-08-01", "2026-08-31", undefined);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "invalid_format");
});

// ---------------------------------------------------------------------------
// formatCentsToBrl / formatDateBr / kindLabel / signedAmountCents
// ---------------------------------------------------------------------------

Deno.test("formatCentsToBrl formata valor positivo simples", () => {
  assertEquals(formatCentsToBrl(4500), "R$ 45,00");
});

Deno.test("formatCentsToBrl formata valor negativo", () => {
  assertEquals(formatCentsToBrl(-4500), "-R$ 45,00");
});

Deno.test("formatCentsToBrl formata milhar", () => {
  assertEquals(formatCentsToBrl(123456789), "R$ 1.234.567,89");
});

Deno.test("formatCentsToBrl formata zero", () => {
  assertEquals(formatCentsToBrl(0), "R$ 0,00");
});

Deno.test("formatDateBr converte aaaa-mm-dd para dd/mm/aaaa", () => {
  assertEquals(formatDateBr("2026-08-15"), "15/08/2026");
});

Deno.test("kindLabel mapeia os 3 tipos", () => {
  assertEquals(kindLabel("income"), "Entrada");
  assertEquals(kindLabel("expense"), "Saída");
  assertEquals(kindLabel("transfer"), "Transferência");
});

Deno.test("signedAmountCents: income positivo, expense/transfer negativo", () => {
  assertEquals(signedAmountCents(row({ kind: "income", amount_cents: 100 })), 100);
  assertEquals(signedAmountCents(row({ kind: "expense", amount_cents: 100 })), -100);
  assertEquals(signedAmountCents(row({ kind: "transfer", amount_cents: 100 })), -100);
});

// ---------------------------------------------------------------------------
// buildCsvContent (AC1)
// ---------------------------------------------------------------------------

Deno.test("buildCsvContent inclui todas as colunas exigidas pelo AC1 no cabeçalho", () => {
  const csv = buildCsvContent([]);
  const [header] = csv.split("\r\n");
  for (const column of ["Data", "Conta", "Forma de pagamento", "Categoria", "Subcategoria", "Descrição", "Tipo", "Valor"]) {
    assertMatch(header, new RegExp(column));
  }
});

Deno.test("buildCsvContent para período sem lançamento produz só o cabeçalho (nunca lança)", () => {
  const csv = buildCsvContent([]);
  const lines = csv.split("\r\n").filter((l) => l.length > 0);
  assertEquals(lines.length, 1);
});

Deno.test("buildCsvContent monta 1 linha por lançamento, com os valores esperados", () => {
  const csv = buildCsvContent([
    row({
      transaction_date: "2026-08-15",
      account_name: "Conta Corrente",
      payment_method_name: "Pix",
      category_name: "Alimentação",
      subcategory_name: null,
      description: "Mercado ABC",
      kind: "expense",
      amount_cents: 4500,
    }),
  ]);
  const lines = csv.split("\r\n").filter((l) => l.length > 0);
  assertEquals(lines.length, 2);
  assertEquals(lines[1], '15/08/2026;Conta Corrente;Pix;Alimentação;;Mercado ABC;Saída;"-R$ 45,00"');
});

Deno.test("buildCsvContent representa subcategoria, forma de pagamento e descrição ausentes como campo vazio (nunca 'null' literal)", () => {
  const csv = buildCsvContent([
    row({
      payment_method_name: null,
      category_name: null,
      subcategory_name: null,
      description: null,
      kind: "transfer",
      amount_cents: 500,
    }),
  ]);
  const lines = csv.split("\r\n").filter((l) => l.length > 0);
  assertEquals(lines[1], '15/08/2026;Conta Corrente;;;;;Transferência;"-R$ 5,00"');
});

Deno.test("buildCsvContent escapa campo com o delimitador ';' entre aspas", () => {
  const csv = buildCsvContent([row({ description: "Mercado; padaria" })]);
  const lines = csv.split("\r\n").filter((l) => l.length > 0);
  assertMatch(lines[1], /"Mercado; padaria"/);
});

// ---------------------------------------------------------------------------
// computeReportSummary (AC2)
// ---------------------------------------------------------------------------

Deno.test("computeReportSummary calcula saldo/entradas/saídas excluindo transfer", () => {
  const summary = computeReportSummary([
    row({ kind: "income", amount_cents: 20000, category_name: "Salário" }),
    row({ kind: "expense", amount_cents: 5000, category_name: "Alimentação" }),
    row({ kind: "transfer", amount_cents: 999999, category_name: null }),
  ]);
  assertEquals(summary.income_cents, 20000);
  assertEquals(summary.expense_cents, 5000);
  assertEquals(summary.balance_cents, 15000);
});

Deno.test("computeReportSummary agrega distribuição por categoria+tipo, somando lançamentos da mesma categoria", () => {
  const summary = computeReportSummary([
    row({ kind: "expense", amount_cents: 3000, category_name: "Alimentação" }),
    row({ kind: "expense", amount_cents: 1500, category_name: "Alimentação" }),
    row({ kind: "expense", amount_cents: 2000, category_name: "Transporte" }),
    row({ kind: "income", amount_cents: 20000, category_name: "Salário" }),
  ]);
  assertEquals(summary.category_distribution.length, 3);
  const alimentacao = summary.category_distribution.find((c) => c.category_name === "Alimentação");
  assertEquals(alimentacao?.total_cents, 4500);
  assertEquals(alimentacao?.kind, "expense");
});

Deno.test("computeReportSummary ordena distribuição por valor absoluto decrescente", () => {
  const summary = computeReportSummary([
    row({ kind: "expense", amount_cents: 100, category_name: "Pequena" }),
    row({ kind: "income", amount_cents: 50000, category_name: "Grande" }),
  ]);
  assertEquals(summary.category_distribution[0].category_name, "Grande");
});

Deno.test("computeReportSummary usa 'Sem categoria' quando category_name vem nulo em income/expense (defensivo)", () => {
  const summary = computeReportSummary([row({ kind: "expense", amount_cents: 100, category_name: null })]);
  assertEquals(summary.category_distribution[0].category_name, "Sem categoria");
});

Deno.test("computeReportSummary para lista vazia retorna resumo zerado, distribuição vazia, nunca lança", () => {
  const summary = computeReportSummary([]);
  assertEquals(summary, { income_cents: 0, expense_cents: 0, balance_cents: 0, category_distribution: [] });
});

Deno.test("computeReportSummary ignora transfer também na distribuição por categoria", () => {
  const summary = computeReportSummary([row({ kind: "transfer", amount_cents: 500, category_name: null })]);
  assertEquals(summary.category_distribution.length, 0);
});
