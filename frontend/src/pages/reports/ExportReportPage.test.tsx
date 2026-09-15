import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reportExportMocks = vi.hoisted(() => ({
  exportReport: vi.fn(),
  downloadExportedFile: vi.fn(),
}));
vi.mock("../../lib/api/reportExport", async () => {
  const actual = await vi.importActual<typeof import("../../lib/api/reportExport")>("../../lib/api/reportExport");
  return { ...actual, exportReport: reportExportMocks.exportReport, downloadExportedFile: reportExportMocks.downloadExportedFile };
});

const { ExportReportPage } = await import("./ExportReportPage");

beforeEach(() => {
  reportExportMocks.exportReport.mockReset();
  reportExportMocks.downloadExportedFile.mockReset();
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
});

describe("ExportReportPage — S-REP-03 (FE-F3-08)", () => {
  it("renderiza seleção de período (default mês corrente) e formato via radio, CSV pré-selecionado", async () => {
    render(<ExportReportPage />);
    expect(screen.getByRole("heading", { name: "Exportar relatório" })).toBeInTheDocument();
    const csvRadio = screen.getByRole("radio", { name: "CSV" }) as HTMLInputElement;
    const pdfRadio = screen.getByRole("radio", { name: "PDF" }) as HTMLInputElement;
    expect(csvRadio.checked).toBe(true);
    expect(pdfRadio.checked).toBe(false);
  });

  it("exporta em CSV: escolhe o período, clica em Exportar, mostra indicador de geração e depois o botão de download (AC literal)", async () => {
    const user = userEvent.setup();
    let resolveExport: (value: unknown) => void = () => undefined;
    reportExportMocks.exportReport.mockReturnValue(
      new Promise((resolve) => {
        resolveExport = resolve;
      }),
    );

    render(<ExportReportPage />);

    const startInput = screen.getByLabelText("De");
    const endInput = screen.getByLabelText("Até");
    await user.clear(startInput);
    await user.type(startInput, "2026-08-01");
    await user.clear(endInput);
    await user.type(endInput, "2026-08-31");

    await user.click(screen.getByRole("button", { name: "Exportar" }));

    expect(reportExportMocks.exportReport).toHaveBeenCalledWith({ startDate: "2026-08-01", endDate: "2026-08-31", format: "csv" });
    expect(await screen.findByText(/Gerando CSV/)).toBeInTheDocument();

    resolveExport({ signed_url: "https://storage.example/file.csv", filename: "relatorio.csv", expires_in: 300, total_rows: 7 });

    expect(await screen.findByText("Exportação pronta")).toBeInTheDocument();
    expect(screen.getByText(/7 lançamentos no período selecionado/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Baixar arquivo" })).toBeInTheDocument();
  });

  it("exporta em PDF: usuário escolhe o radio PDF e recebe o arquivo correspondente ao período selecionado", async () => {
    const user = userEvent.setup();
    reportExportMocks.exportReport.mockResolvedValue({
      signed_url: "https://storage.example/file.pdf",
      filename: "relatorio-2026-09.pdf",
      expires_in: 300,
      total_rows: 4,
    });

    render(<ExportReportPage />);

    await user.click(screen.getByRole("radio", { name: "PDF" }));
    await user.click(screen.getByRole("button", { name: "Exportar" }));

    await waitFor(() => {
      expect(reportExportMocks.exportReport).toHaveBeenCalledWith(expect.objectContaining({ format: "pdf" }));
    });
    expect(await screen.findByText("Exportação pronta")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Baixar arquivo" }));
    expect(reportExportMocks.downloadExportedFile).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "relatorio-2026-09.pdf" }),
    );
  });

  it("conteúdo corresponde ao período selecionado: chama exportReport com as datas exatas escolhidas pelo usuário", async () => {
    const user = userEvent.setup();
    reportExportMocks.exportReport.mockResolvedValue({
      signed_url: "https://storage.example/file.csv",
      filename: "relatorio.csv",
      expires_in: 300,
      total_rows: 0,
    });

    render(<ExportReportPage />);
    const startInput = screen.getByLabelText("De");
    const endInput = screen.getByLabelText("Até");
    await user.clear(startInput);
    await user.type(startInput, "2025-01-01");
    await user.clear(endInput);
    await user.type(endInput, "2025-12-31");
    await user.click(screen.getByRole("button", { name: "Exportar" }));

    await waitFor(() => {
      expect(reportExportMocks.exportReport).toHaveBeenCalledWith({ startDate: "2025-01-01", endDate: "2025-12-31", format: "csv" });
    });
  });

  it("estado de erro exibe Alert quando a geração falha, sem quebrar a tela", async () => {
    const user = userEvent.setup();
    reportExportMocks.exportReport.mockRejectedValue(new Error("falhou"));

    render(<ExportReportPage />);
    await user.click(screen.getByRole("button", { name: "Exportar" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("desabilita 'Exportar' e mostra aviso quando offline (não depende de comportamento não suportado offline)", async () => {
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
    render(<ExportReportPage />);
    window.dispatchEvent(new Event("offline"));

    expect(await screen.findByText(/Sem conexão com a internet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar" })).toBeDisabled();
  });

  it("período inválido (data final antes da inicial) desabilita Exportar e mostra erro de campo", async () => {
    const user = userEvent.setup();
    render(<ExportReportPage />);

    const startInput = screen.getByLabelText("De");
    const endInput = screen.getByLabelText("Até");
    await user.clear(startInput);
    await user.type(startInput, "2026-09-30");
    await user.clear(endInput);
    await user.type(endInput, "2026-09-01");

    expect(screen.getByRole("button", { name: "Exportar" })).toBeDisabled();
    expect(screen.getByText(/O período final não pode ser anterior ao inicial/)).toBeInTheDocument();
  });
});
