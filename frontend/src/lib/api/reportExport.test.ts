import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { invokeEdgeFunction } from "./edgeFunctions";
import { downloadExportedFile, exportReport } from "./reportExport";
import type { ReportExportResult } from "./reportExport";

vi.mock("./edgeFunctions", () => ({
  invokeEdgeFunction: vi.fn(),
}));

describe("reportExport API client — /report-export (BE-F3-07), consumido por ExportReportPage (FE-F3-08)", () => {
  describe("exportReport", () => {
    it("invoca a edge function 'report-export' com start_date/end_date/format e retorna o resultado", async () => {
      const result: ReportExportResult = {
        signed_url: "https://storage.example/exports/user/file.csv?token=abc",
        filename: "relatorio-2026-09-01-a-2026-09-30.csv",
        expires_in: 300,
        total_rows: 12,
      };
      vi.mocked(invokeEdgeFunction).mockResolvedValue(result);

      const response = await exportReport({ startDate: "2026-09-01", endDate: "2026-09-30", format: "csv" });

      expect(invokeEdgeFunction).toHaveBeenCalledWith("report-export", {
        start_date: "2026-09-01",
        end_date: "2026-09-30",
        format: "csv",
      });
      expect(response).toEqual(result);
    });

    it("também funciona para formato pdf, com o conteúdo correspondente ao período selecionado (AC literal)", async () => {
      const result: ReportExportResult = {
        signed_url: "https://storage.example/exports/user/file.pdf?token=xyz",
        filename: "relatorio-2026-01-01-a-2026-01-31.pdf",
        expires_in: 300,
        total_rows: 5,
      };
      vi.mocked(invokeEdgeFunction).mockResolvedValue(result);

      const response = await exportReport({ startDate: "2026-01-01", endDate: "2026-01-31", format: "pdf" });

      expect(invokeEdgeFunction).toHaveBeenCalledWith("report-export", {
        start_date: "2026-01-01",
        end_date: "2026-01-31",
        format: "pdf",
      });
      expect(response.filename).toBe("relatorio-2026-01-01-a-2026-01-31.pdf");
    });

    it("propaga falha (400/502/rede) sem interceptar — cabe ao chamador (ExportReportPage) exibir o erro", async () => {
      vi.mocked(invokeEdgeFunction).mockRejectedValue(new Error("report_data_unavailable"));

      await expect(exportReport({ startDate: "2026-09-01", endDate: "2026-09-30", format: "csv" })).rejects.toThrow(
        "report_data_unavailable",
      );
    });
  });

  describe("downloadExportedFile", () => {
    const originalFetch = globalThis.fetch;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => "blob:mock-object-url");
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it("busca a signed URL, cria um object URL e dispara o download via <a download>", async () => {
      const blob = new Blob(["conteudo"], { type: "text/csv" });
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) });

      const clickSpy = vi.fn();
      const appendSpy = vi.spyOn(document.body, "appendChild");
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === "a") {
          element.click = clickSpy;
        }
        return element;
      });

      const result: ReportExportResult = {
        signed_url: "https://storage.example/exports/user/file.csv?token=abc",
        filename: "relatorio.csv",
        expires_in: 300,
        total_rows: 3,
      };

      await downloadExportedFile(result);

      expect(globalThis.fetch).toHaveBeenCalledWith(result.signed_url);
      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(appendSpy).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-object-url");

      vi.restoreAllMocks();
    });

    it("lança erro claro quando o download da signed URL falha (nunca finge sucesso)", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, blob: () => Promise.resolve(new Blob()) });

      const result: ReportExportResult = {
        signed_url: "https://storage.example/exports/user/file.csv?token=expired",
        filename: "relatorio.csv",
        expires_in: 300,
        total_rows: 3,
      };

      await expect(downloadExportedFile(result)).rejects.toThrow("Não foi possível baixar o arquivo gerado.");
    });
  });
});
