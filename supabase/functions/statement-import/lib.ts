// BE-F3-03 — Edge Function `statement-import` (RF-F3-03 AC1-3, TASK.md Seção
// 3.3). Helpers puros/testáveis, separados de `index.ts` (wiring HTTP) —
// mesmo espírito de `receipt-ocr/lib.ts` (BE-F3-01) e `voice-capture/lib.ts`
// (BE-F3-02), os dois precedentes mais próximos deste arquivo.
//
// Responsabilidade: (1) interpretar um arquivo de extrato bancário OFX ou CSV
// e produzir uma lista de transações candidatas normalizadas (AC1); (2)
// comparar cada candidata contra os lançamentos já existentes do usuário
// (mesma data/valor/conta) para sinalizar possível duplicata (AC2). Nenhuma
// função aqui persiste nada — `index.ts` só LÊ `transactions` (via cliente
// com o JWT do usuário, RLS aplicada) para a detecção de duplicata; a
// persistência do candidato em `candidate_transaction` e a confirmação final
// continuam exclusivamente a cargo do fluxo já publicado em `BE-F3-00`
// (`/candidate_transaction`, `/rpc/confirm_candidate_transaction`) — reuso
// explícito de FL-05, não um mecanismo de persistência paralelo (AC3).
//
// Cada parser abaixo nunca lança por causa de UMA linha malformada — pula a
// linha (conta em `skipped_lines`) e continua as demais, mesmo princípio de
// AC3 de RF-F3-02/RF-F3-01 aplicado aqui por consistência de produto. Só
// retorna erro (arquivo "ilegível") quando NENHUMA transação válida é
// encontrada no arquivo inteiro — nunca lança exceção, sempre um resultado
// discriminado por `ok` (mesmo padrão de `validateImageInput`/
// `validateVoiceInput`).

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type StatementFileFormat = "ofx" | "csv";
export type StatementTransactionKind = "income" | "expense";

export interface ParsedStatementTransaction {
  transaction_date: string; // ISO 8601 YYYY-MM-DD
  amount_cents: number; // sempre positivo — sinal vira `kind`
  kind: StatementTransactionKind;
  description: string | null;
  /** Identificador da linha/registro de origem (FITID do OFX, índice da linha do CSV) — só para rastreabilidade em `raw_payload`, nunca usado para achar duplicata (isso é sempre data/valor/conta, RF-F3-03 AC2). */
  external_ref: string | null;
}

export interface StatementParseResult {
  transactions: ParsedStatementTransaction[];
  /** Quantidade de linhas/registros do arquivo que não puderam ser interpretados e foram pulados (AC3 — nunca bloqueia os demais). */
  skipped_lines: number;
}

// ---------------------------------------------------------------------------
// Validação de entrada do corpo da requisição.
// ---------------------------------------------------------------------------
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB decodificado — extrato de texto, bem mais leve que imagem/áudio
export const ALLOWED_FORMATS: readonly StatementFileFormat[] = ["ofx", "csv"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface StatementInputValidationError {
  ok: false;
  error:
    | "missing_file"
    | "invalid_base64"
    | "file_too_large"
    | "invalid_file_format"
    | "missing_account_id"
    | "invalid_account_id";
  message: string;
}

export interface StatementInputValidationSuccess {
  ok: true;
  fileText: string;
  format: StatementFileFormat;
  accountId: string;
}

/** Decodifica base64 padrão (não url-safe) para bytes, depois UTF-8. Mesmo
 *  helper de `receipt-ocr/lib.ts`/`voice-capture/lib.ts`, duplicado aqui
 *  deliberadamente — cada Edge Function é um deploy isolado, sem módulo
 *  compartilhado de baixo nível entre elas neste projeto. */
export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function validateStatementImportInput(
  fileContentBase64: unknown,
  fileFormat: unknown,
  accountId: unknown,
): StatementInputValidationSuccess | StatementInputValidationError {
  if (typeof fileContentBase64 !== "string" || fileContentBase64.length === 0) {
    return { ok: false, error: "missing_file", message: "file_content_base64 é obrigatório." };
  }

  if (
    typeof fileFormat !== "string" ||
    !(ALLOWED_FORMATS as readonly string[]).includes(fileFormat)
  ) {
    return {
      ok: false,
      error: "invalid_file_format",
      message: `file_format deve ser um de: ${ALLOWED_FORMATS.join(", ")}.`,
    };
  }

  if (typeof accountId !== "string" || accountId.length === 0) {
    return { ok: false, error: "missing_account_id", message: "account_id é obrigatório." };
  }
  if (!UUID_RE.test(accountId)) {
    return { ok: false, error: "invalid_account_id", message: "account_id deve ser um uuid válido." };
  }

  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(fileContentBase64);
  } catch {
    return { ok: false, error: "invalid_base64", message: "file_content_base64 não é base64 válido." };
  }

  if (bytes.length === 0) {
    return { ok: false, error: "missing_file", message: "file_content_base64 está vazio." };
  }
  if (bytes.length > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: "file_too_large",
      message: `Arquivo excede o tamanho máximo permitido (${MAX_FILE_BYTES} bytes).`,
    };
  }

  const fileText = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return { ok: true, fileText, format: fileFormat as StatementFileFormat, accountId };
}

// ---------------------------------------------------------------------------
// Parser OFX (RF-F3-03 AC1) — extração via regex sobre blocos <STMTTRN>...
// </STMTTRN>, não um parser XML/SGML completo: muitos arquivos OFX reais são
// SGML "solto" (tags sem fechamento, ex. <DTPOSTED>... sem </DTPOSTED>), um
// parser XML estrito rejeitaria arquivos válidos de banco real. Cobertura
// suficiente para os campos que este produto precisa (data/valor/descrição/
// identificador) — decisão de escopo pequena, documentada aqui.
// ---------------------------------------------------------------------------

const STMTTRN_BLOCK_RE = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
const OFX_TAG_RE = (tag: string) => new RegExp(`<${tag}>\\s*([^<\\r\\n]*)`, "i");

function extractOfxTag(block: string, tag: string): string | undefined {
  const match = block.match(OFX_TAG_RE(tag));
  const value = match?.[1]?.trim();
  return value && value.length > 0 ? value : undefined;
}

/** `DTPOSTED` do OFX vem como `YYYYMMDDHHMMSS[.sss][ofsGMT]` — só os 8
 *  primeiros dígitos (YYYYMMDD) importam para este produto. Retorna
 *  `undefined` (nunca lança) se não for uma data de calendário plausível. */
function parseOfxDate(raw: string): string | undefined {
  const digits = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!digits) return undefined;
  const month = parseInt(digits[2], 10);
  const day = parseInt(digits[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return `${digits[1]}-${digits[2]}-${digits[3]}`;
}

/** `TRNAMT` do OFX é assinado (negativo = saída, positivo = entrada) — mesma
 *  convenção adotada para `amount_cents`/`kind` deste módulo. Retorna
 *  `undefined` (nunca lança) se não for um número reconhecível. */
function parseOfxAmount(raw: string): { amountCents: number; kind: StatementTransactionKind } | undefined {
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const value = parseFloat(normalized);
  if (!Number.isFinite(value) || value === 0) return undefined;
  const cents = Math.round(Math.abs(value) * 100);
  return { amountCents: cents, kind: value < 0 ? "expense" : "income" };
}

/** RF-F3-03 AC1: interpreta um arquivo OFX, um `<STMTTRN>` por transação.
 *  Nunca lança — bloco sem `DTPOSTED`/`TRNAMT` reconhecível é pulado (conta
 *  em `skipped_lines`); arquivo sem nenhum `<STMTTRN>` retorna lista vazia
 *  (fica a cargo do chamador decidir se isso é "arquivo ilegível", já que
 *  aqui não há acesso ao texto bruto para diferenciar "extrato vazio de
 *  verdade" de "não é um OFX"). */
export function parseOfx(fileText: string): StatementParseResult {
  const transactions: ParsedStatementTransaction[] = [];
  let skipped = 0;

  const blocks = [...fileText.matchAll(STMTTRN_BLOCK_RE)];
  for (const match of blocks) {
    const block = match[1];
    const dtPosted = extractOfxTag(block, "DTPOSTED");
    const trnAmt = extractOfxTag(block, "TRNAMT");

    const date = dtPosted ? parseOfxDate(dtPosted) : undefined;
    const amount = trnAmt ? parseOfxAmount(trnAmt) : undefined;

    if (!date || !amount) {
      skipped++;
      continue;
    }

    const memo = extractOfxTag(block, "MEMO");
    const name = extractOfxTag(block, "NAME");
    const fitId = extractOfxTag(block, "FITID");

    transactions.push({
      transaction_date: date,
      amount_cents: amount.amountCents,
      kind: amount.kind,
      description: (memo ?? name ?? null)?.slice(0, 255) ?? null,
      external_ref: fitId ?? null,
    });
  }

  return { transactions, skipped_lines: skipped };
}

// ---------------------------------------------------------------------------
// Parser CSV (RF-F3-03 AC1) — cabeçalho com nomes de coluna reconhecidos em
// pt-BR/en (decisão física do Backend, SDD.md não define um layout de CSV de
// extrato — não existe padrão único entre bancos). Suporta `,` ou `;` como
// delimitador (detectado pelo cabeçalho) e campos entre aspas duplas (CSV
// básico, sem aspas escapadas `""` dentro de um campo — cobertura suficiente
// para exportação de extrato bancário comum).
// ---------------------------------------------------------------------------

const DATE_COLUMN_NAMES = ["data", "date"];
const DESCRIPTION_COLUMN_NAMES = ["descricao", "descrição", "description", "historico", "histórico", "memo"];
const AMOUNT_COLUMN_NAMES = ["valor", "amount", "value"];

function normalizeHeaderCell(cell: string): string {
  return cell
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Split de uma linha CSV respeitando aspas duplas simples (sem `""`
 *  escapado dentro do campo) — suficiente para extrato bancário comum, nunca
 *  lança em entrada inesperada (pior caso: split "ingênuo" pelo delimitador). */
function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function detectCsvDelimiter(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

/** Aceita `dd/mm/aaaa` ou `aaaa-mm-dd`. Nunca lança — retorna `undefined`
 *  para qualquer outro formato ou data de calendário implausível. */
function parseCsvDate(raw: string): string | undefined {
  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10);
    if (day < 1 || day > 31 || month < 1 || month > 12) return undefined;
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (day < 1 || day > 31 || month < 1 || month > 12) return undefined;
    return raw;
  }
  return undefined;
}

/** Aceita `1.234,56` (BRL), `1234,56`, `1234.56`, `-45.9`, etc — sinal
 *  determina `kind` (negativo = saída). Nunca lança — retorna `undefined`
 *  se não for um número reconhecível ou for zero. */
function parseCsvAmount(raw: string): { amountCents: number; kind: StatementTransactionKind } | undefined {
  let normalized = raw.trim();
  if (normalized.length === 0) return undefined;

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");
  if (hasComma && hasDot) {
    // Formato BRL com milhar: "1.234,56"
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // "1234,56" -> decimal BRL sem separador de milhar
    normalized = normalized.replace(",", ".");
  }
  // "1234.56" (já formato JS) ou inteiro puro seguem sem alteração.

  const value = parseFloat(normalized);
  if (!Number.isFinite(value) || value === 0) return undefined;
  const cents = Math.round(Math.abs(value) * 100);
  return { amountCents: cents, kind: value < 0 ? "expense" : "income" };
}

/** RF-F3-03 AC1: interpreta um arquivo CSV de extrato. Primeira linha não
 *  vazia é sempre o cabeçalho — precisa ter ao menos uma coluna de data e
 *  uma de valor reconhecidas (`DATE_COLUMN_NAMES`/`AMOUNT_COLUMN_NAMES`),
 *  senão retorna `transactions: []` (arquivo tratado como "sem cabeçalho
 *  reconhecível" pelo chamador). Linha de dado sem data/valor válidos é
 *  pulada (conta em `skipped_lines`), nunca lança. */
export function parseCsv(fileText: string): StatementParseResult {
  const lines = fileText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { transactions: [], skipped_lines: 0 };

  const delimiter = detectCsvDelimiter(lines[0]);
  const headerCells = splitCsvLine(lines[0], delimiter).map(normalizeHeaderCell);

  const dateIdx = headerCells.findIndex((c) => DATE_COLUMN_NAMES.includes(c));
  const amountIdx = headerCells.findIndex((c) => AMOUNT_COLUMN_NAMES.includes(c));
  const descriptionIdx = headerCells.findIndex((c) => DESCRIPTION_COLUMN_NAMES.includes(c));

  if (dateIdx === -1 || amountIdx === -1) {
    return { transactions: [], skipped_lines: 0 };
  }

  const transactions: ParsedStatementTransaction[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i], delimiter);
    const dateRaw = cells[dateIdx];
    const amountRaw = cells[amountIdx];

    const date = dateRaw ? parseCsvDate(dateRaw) : undefined;
    const amount = amountRaw ? parseCsvAmount(amountRaw) : undefined;

    if (!date || !amount) {
      skipped++;
      continue;
    }

    const description = descriptionIdx !== -1 ? cells[descriptionIdx] : undefined;

    transactions.push({
      transaction_date: date,
      amount_cents: amount.amountCents,
      kind: amount.kind,
      description: description && description.length > 0 ? description.slice(0, 255) : null,
      external_ref: `csv:${i + 1}`, // 1-indexed, +1 pela linha de cabeçalho — só rastreabilidade
    });
  }

  return { transactions, skipped_lines: skipped };
}

/** Ponto único chamado por `index.ts` — despacha para o parser do formato
 *  informado. Nunca lança (delega a garantia a `parseOfx`/`parseCsv`). */
export function parseStatementFile(fileText: string, format: StatementFileFormat): StatementParseResult {
  return format === "ofx" ? parseOfx(fileText) : parseCsv(fileText);
}

// ---------------------------------------------------------------------------
// Detecção de possível duplicata (RF-F3-03 AC2) — mesma data/valor/conta de
// um lançamento já existente. Função pura: recebe a lista de lançamentos
// existentes já filtrada por `account_id` do usuário (I/O fica em
// `index.ts`, via `userClient` com RLS aplicada) e decide, por transação
// candidata, se há correspondência.
// ---------------------------------------------------------------------------

export interface ExistingTransactionForDuplicateCheck {
  id: string;
  transaction_date: string;
  amount_cents: number;
}

/** Retorna o `id` do primeiro lançamento existente com mesma
 *  `transaction_date`+`amount_cents` (conta já é a mesma — filtrada pelo
 *  chamador antes de montar `existing`), ou `undefined` se nenhuma
 *  correspondência. RF-F3-03 AC2 é literal "mesma data/valor/conta" — não
 *  compara `kind`/descrição (uma transação pode ter sido categorizada
 *  diferente manualmente e ainda ser a mesma ocorrência física). */
export function findDuplicateMatch(
  candidate: ParsedStatementTransaction,
  existing: ExistingTransactionForDuplicateCheck[],
): string | undefined {
  const match = existing.find(
    (t) => t.transaction_date === candidate.transaction_date && t.amount_cents === candidate.amount_cents,
  );
  return match?.id;
}

// ---------------------------------------------------------------------------
// Monta o payload de candidato pronto para `POST /candidate_transaction`
// (`NewCandidateTransaction`, `BE-F3-00`) — nunca inserido por esta função,
// só devolvido na resposta HTTP para o Frontend decidir quando persistir
// (RF-F3-03 AC1/AC3).
// ---------------------------------------------------------------------------

export interface StatementCandidatePayload {
  source: "import";
  raw_payload: {
    transaction_date: string;
    amount_cents: number;
    kind: StatementTransactionKind;
    description: string | null;
    external_ref: string | null;
  };
  duplicate_of_transaction_id: string | null;
}

export function buildStatementCandidatePayload(
  transaction: ParsedStatementTransaction,
  duplicateOfTransactionId: string | undefined,
): StatementCandidatePayload {
  return {
    source: "import",
    raw_payload: {
      transaction_date: transaction.transaction_date,
      amount_cents: transaction.amount_cents,
      kind: transaction.kind,
      description: transaction.description,
      external_ref: transaction.external_ref,
    },
    duplicate_of_transaction_id: duplicateOfTransactionId ?? null,
  };
}
