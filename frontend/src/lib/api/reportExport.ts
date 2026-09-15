import { invokeEdgeFunction } from "./edgeFunctions";

/**
 * Client de `/report-export` — `API-CONTRACT.yaml` v0.25.0 (`BE-F3-07`, já
 * Concluída — contrato real, não mock), consumido por `ExportReportPage`
 * (`UX-SPEC.md` S-REP-03, `FE-F3-08`). A Edge Function não persiste nenhum
 * estado consultável pelo Frontend além do próprio arquivo já gerado — devolve
 * uma signed URL de curta duração (300s) pronta para download imediato.
 */

export type ReportExportFormat = "csv" | "pdf";

export interface ReportExportInput {
  startDate: string;
  endDate: string;
  format: ReportExportFormat;
}

export interface ReportExportResult {
  signed_url: string;
  filename: string;
  expires_in: number;
  total_rows: number;
}

/** Gera o CSV/PDF do período informado e devolve a signed URL de download (RF-F3-06 AC1-2). */
export async function exportReport(input: ReportExportInput): Promise<ReportExportResult> {
  return invokeEdgeFunction<ReportExportResult>("report-export", {
    start_date: input.startDate,
    end_date: input.endDate,
    format: input.format,
  });
}

/**
 * Baixa o arquivo já gerado a partir da signed URL (`ExportReportPage`, S-REP-03
 * "indicador de geração → download"). Decisão pequena documentada aqui: o upload
 * de `BE-F3-07` não define `Content-Disposition: attachment` na signed URL
 * (`createSignedUrl` sem a opção `download`), então um `<a href>` direto para a
 * URL cross-origin não teria o nome de arquivo/força de download garantidos em
 * todo navegador — este helper busca o arquivo como blob (a signed URL já
 * permite leitura cross-origin sem credencial) e dispara o download via um
 * `<a>` temporário com `download=filename`, funcionando de forma consistente
 * independente de o navegador estar online apenas para esta chamada de rede
 * pontual (a exportação em si sempre exige conexão — não há geração offline).
 */
export async function downloadExportedFile(result: ReportExportResult): Promise<void> {
  const response = await fetch(result.signed_url);
  if (!response.ok) {
    throw new Error("Não foi possível baixar o arquivo gerado.");
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
