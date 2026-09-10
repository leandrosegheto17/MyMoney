// report-export — BE-F3-07 (TASK.md Seção 3.3, RF-F3-06 AC1-2).
//
// Helpers puros/testáveis, separados de `index.ts` (wiring HTTP) e de
// `pdf.ts` (geração de bytes via `pdf-lib`) — mesmo espírito de
// `receipt-ocr/lib.ts` (BE-F3-01), `voice-capture/lib.ts` (BE-F3-02) e
// `statement-import/lib.ts` (BE-F3-03).
//
// Responsabilidade: (1) validar a entrada do corpo da requisição (período +
// formato); (2) montar o conteúdo CSV a partir das linhas devolvidas por
// `public.get_report_export_rows` (AC1 — data, conta, forma de pagamento,
// categoria, subcategoria, descrição, tipo, valor); (3) agregar o resumo do
// período (saldo, entradas, saídas, distribuição por categoria) usado pelo
// PDF (AC2). Nenhuma função aqui faz I/O — a única leitura ao banco
// (`get_report_export_rows` via `userClient`, RLS aplicada) e o upload ao
// Storage ficam em `index.ts`.
//
// Decisão de design central (mesmo princípio de RF-F3-03/`statement-import`):
// `kind = transfer` é incluído no CSV (extrato completo do período, AC1 não
// exclui nenhum tipo de lançamento) mas é EXCLUÍDO do resumo entradas/saídas
// do PDF (AC2) — mesmo critério já estabelecido por
// `get_income_expense_report` (BE-F2-10): movimentação interna entre contas
// não é entrada nem saída. Continua compondo o "saldo do período" (AC2,
// texto literal "saldo"), calculado aqui como entradas - saídas - saída de
// transfer (visão de fluxo de caixa do período, não o saldo consolidado das
// contas — esse já é RF-F3-05/BE-F3-06, escopo diferente).

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type ReportExportFormat = "csv" | "pdf";
export type ReportTransactionKind = "income" | "expense" | "transfer";

export interface ReportExportRow {
  transaction_date: string; // ISO 8601 YYYY-MM-DD
  account_name: string;
  payment_method_name: string | null;
  category_name: string | null;
  subcategory_name: string | null;
  description: string | null;
  kind: ReportTransactionKind;
  amount_cents: number;
}

// ---------------------------------------------------------------------------
// Validação de entrada do corpo da requisição.
// ---------------------------------------------------------------------------

export const ALLOWED_FORMATS: readonly ReportExportFormat[] = ["csv", "pdf"];
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface ReportExportInputValidationError {
  ok: false;
  error:
    | "missing_start_date"
    | "missing_end_date"
    | "invalid_start_date"
    | "invalid_end_date"
    | "invalid_date_range"
    | "invalid_format";
  message: string;
}

export interface ReportExportInputValidationSuccess {
  ok: true;
  startDate: string;
  endDate: string;
  format: ReportExportFormat;
}

/** Aceita só `aaaa-mm-dd`, com validação de data de calendário plausível
 *  (não só o formato do texto) — nunca lança. */
function isValidIsoDate(raw: string): boolean {
  const match = raw.match(DATE_RE);
  if (!match) return false;
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  return true;
}

export function validateReportExportInput(
  startDate: unknown,
  endDate: unknown,
  format: unknown,
): ReportExportInputValidationSuccess | ReportExportInputValidationError {
  if (typeof startDate !== "string" || startDate.length === 0) {
    return { ok: false, error: "missing_start_date", message: "start_date é obrigatório." };
  }
  if (!isValidIsoDate(startDate)) {
    return { ok: false, error: "invalid_start_date", message: "start_date deve ser uma data válida no formato aaaa-mm-dd." };
  }

  if (typeof endDate !== "string" || endDate.length === 0) {
    return { ok: false, error: "missing_end_date", message: "end_date é obrigatório." };
  }
  if (!isValidIsoDate(endDate)) {
    return { ok: false, error: "invalid_end_date", message: "end_date deve ser uma data válida no formato aaaa-mm-dd." };
  }

  if (startDate > endDate) {
    return { ok: false, error: "invalid_date_range", message: "start_date não pode ser posterior a end_date." };
  }

  if (typeof format !== "string" || !(ALLOWED_FORMATS as readonly string[]).includes(format)) {
    return { ok: false, error: "invalid_format", message: `format deve ser um de: ${ALLOWED_FORMATS.join(", ")}.` };
  }

  return { ok: true, startDate, endDate, format: format as ReportExportFormat };
}

// ---------------------------------------------------------------------------
// CSV (RF-F3-06 AC1) — colunas mínimas exigidas literalmente pelo AC: data,
// conta, forma de pagamento, categoria, subcategoria, descrição, tipo, valor.
// ---------------------------------------------------------------------------

const CSV_HEADER = ["Data", "Conta", "Forma de pagamento", "Categoria", "Subcategoria", "Descrição", "Tipo", "Valor"];

export function kindLabel(kind: ReportTransactionKind): string {
  if (kind === "income") return "Entrada";
  if (kind === "expense") return "Saída";
  return "Transferência";
}

/** Data em aaaa-mm-dd -> dd/mm/aaaa (convenção pt-BR já usada em todo o
 *  produto, ex. `parseCsvDate`/`parseOfxDate` de `statement-import`). */
export function formatDateBr(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/** Formata centavos em BRL com vírgula decimal e milhar por ponto,
 *  preservando sinal (negativo = saída, mesma convenção de
 *  `statement-import`/`get_income_expense_report`). */
export function formatCentsToBrl(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const integerPart = Math.floor(abs / 100);
  const decimalPart = (abs % 100).toString().padStart(2, "0");
  const withThousands = integerPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}R$ ${withThousands},${decimalPart}`;
}

/** Escapa um campo para CSV (RFC 4180 simplificado): envolve em aspas
 *  duplas quando contém delimitador, aspas ou quebra de linha; aspas
 *  internas são duplicadas. Nunca lança. */
function escapeCsvField(value: string): string {
  if (/[",;\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Sinal aplicado ao valor de cada linha (AC1 não exige coluna de sinal
 *  separada, mas o valor com sinal facilita totalização em planilha):
 *  income = positivo, expense/transfer = negativo (dinheiro sai da conta
 *  de origem da linha) — decisão de interpretação pequena, documentada
 *  aqui, mesma convenção de sinal já usada por
 *  `parseOfxAmount`/`parseCsvAmount` (`statement-import`). */
export function signedAmountCents(row: ReportExportRow): number {
  return row.kind === "income" ? row.amount_cents : -row.amount_cents;
}

/** RF-F3-06 AC1: monta o conteúdo CSV completo (cabeçalho + 1 linha por
 *  lançamento do período, na ordem já recebida de
 *  `get_report_export_rows` — cronológica). Nunca lança; período sem
 *  nenhum lançamento produz um CSV só com o cabeçalho (nunca um erro). */
export function buildCsvContent(rows: ReportExportRow[]): string {
  const lines = [CSV_HEADER.map(escapeCsvField).join(";")];
  for (const row of rows) {
    lines.push(
      [
        formatDateBr(row.transaction_date),
        row.account_name,
        row.payment_method_name ?? "",
        row.category_name ?? "",
        row.subcategory_name ?? "",
        row.description ?? "",
        kindLabel(row.kind),
        formatCentsToBrl(signedAmountCents(row)),
      ]
        .map((cell) => escapeCsvField(cell))
        .join(";"),
    );
  }
  // \r\n — CSV lido corretamente por Excel/Sheets em qualquer plataforma,
  // não só \n.
  return lines.join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------------------
// Resumo do período (RF-F3-06 AC2) — saldo, entradas, saídas, distribuição
// por categoria. Usado só pelo PDF; agregação em código de aplicação (não em
// SQL), mesma decisão de "RPC devolve linha, resumo é responsabilidade do
// Edge Function" documentada na migration desta tarefa.
// ---------------------------------------------------------------------------

export interface CategoryDistributionEntry {
  category_name: string;
  kind: ReportTransactionKind;
  total_cents: number;
}

export interface ReportSummary {
  income_cents: number;
  expense_cents: number;
  balance_cents: number;
  category_distribution: CategoryDistributionEntry[];
}

/** RF-F3-06 AC2. `kind = transfer` é excluído de entradas/saídas/saldo
 *  (mesmo critério de `get_income_expense_report`/BE-F2-10 — movimentação
 *  interna não é entrada nem saída) e também da distribuição por categoria
 *  (transfer nunca tem `category_id`, ver
 *  `transactions_non_transfer_requires_method_and_category`). Categoria
 *  ausente (não deveria ocorrer para income/expense, mas defensivamente
 *  tratado) é agrupada como "Sem categoria" — nunca descartada
 *  silenciosamente. Nunca lança; lista de linhas vazia produz resumo
 *  zerado com distribuição vazia. */
export function computeReportSummary(rows: ReportExportRow[]): ReportSummary {
  let incomeCents = 0;
  let expenseCents = 0;
  const distributionMap = new Map<string, CategoryDistributionEntry>();

  for (const row of rows) {
    if (row.kind === "transfer") continue;

    if (row.kind === "income") incomeCents += row.amount_cents;
    else expenseCents += row.amount_cents;

    const categoryName = row.category_name ?? "Sem categoria";
    const key = `${row.kind}:${categoryName}`;
    const existing = distributionMap.get(key);
    if (existing) {
      existing.total_cents += row.amount_cents;
    } else {
      distributionMap.set(key, { category_name: categoryName, kind: row.kind, total_cents: row.amount_cents });
    }
  }

  const categoryDistribution = [...distributionMap.values()].sort((a, b) => b.total_cents - a.total_cents);

  return {
    income_cents: incomeCents,
    expense_cents: expenseCents,
    balance_cents: incomeCents - expenseCents,
    category_distribution: categoryDistribution,
  };
}
