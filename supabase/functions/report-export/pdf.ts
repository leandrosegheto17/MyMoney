// report-export/pdf.ts — BE-F3-07 (RF-F3-06 AC2).
//
// Geração de bytes do PDF de resumo do período, via `pdf-lib`
// (`npm:pdf-lib`, mesmo padrão de import npm já usado por
// `backup-export/index.ts` — `npm:aws4fetch`). Separado de `lib.ts`
// deliberadamente: é a única função deste módulo com I/O implícito
// (download do pacote no cold start) e assíncrona — mantém `lib.ts` 100%
// síncrono/testável sem depender de `pdf-lib`.
//
// Layout mínimo (RF-F3-06 AC2 — "resumo do período: saldo, entradas,
// saídas, distribuição por categoria"; UX-SPEC.md não detalha um mockup
// pixel-a-pixel para o CONTEÚDO do PDF em si, só o fluxo de tela S-REP-03
// que dispara a geração — decisão de interpretação pequena, documentada
// aqui, mesmo padrão de decisão de layout físico já tomado por
// `BE-F3-06`/`BE-F2-10` para janela/granularidade de relatório): 1 página
// A4, título, período, 3 linhas de resumo (Saldo/Entradas/Saídas), seção de
// distribuição por categoria (1 linha por categoria+tipo, ordenada por
// valor absoluto desc — mesma ordenação de `computeReportSummary`).
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { formatCentsToBrl, formatDateBr, kindLabel, type ReportSummary } from "./lib.ts";

const PAGE_MARGIN = 50;
const TITLE_SIZE = 18;
const HEADING_SIZE = 13;
const BODY_SIZE = 11;
const LINE_HEIGHT = 18;

export async function buildReportPdfBytes(
  summary: ReportSummary,
  startDateIso: string,
  endDateIso: string,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 em pontos
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let cursorY = page.getHeight() - PAGE_MARGIN;

  const drawLine = (text: string, opts?: { bold?: boolean; size?: number }) => {
    page.drawText(text, {
      x: PAGE_MARGIN,
      y: cursorY,
      size: opts?.size ?? BODY_SIZE,
      font: opts?.bold ? boldFont : font,
      color: rgb(0, 0, 0),
    });
    cursorY -= LINE_HEIGHT;
  };

  drawLine("Relatório do período", { bold: true, size: TITLE_SIZE });
  cursorY -= 6;
  drawLine(`Período: ${formatDateBr(startDateIso)} a ${formatDateBr(endDateIso)}`);
  cursorY -= 10;

  drawLine("Resumo", { bold: true, size: HEADING_SIZE });
  drawLine(`Saldo do período: ${formatCentsToBrl(summary.balance_cents)}`);
  drawLine(`Entradas: ${formatCentsToBrl(summary.income_cents)}`);
  drawLine(`Saídas: ${formatCentsToBrl(-summary.expense_cents)}`);
  cursorY -= 10;

  drawLine("Distribuição por categoria", { bold: true, size: HEADING_SIZE });
  if (summary.category_distribution.length === 0) {
    drawLine("Nenhuma transação no período.");
  } else {
    for (const entry of summary.category_distribution) {
      const signedTotal = entry.kind === "income" ? entry.total_cents : -entry.total_cents;
      drawLine(`${entry.category_name} (${kindLabel(entry.kind)}): ${formatCentsToBrl(signedTotal)}`);
      // Página única é suficiente para o layout mínimo desta tarefa; uma
      // lista de categorias muito longa que estourasse a página é
      // melhoria futura fora do escopo de AC2 (nenhum caso real do produto
      // tem centenas de categorias).
    }
  }

  return pdfDoc.save();
}
