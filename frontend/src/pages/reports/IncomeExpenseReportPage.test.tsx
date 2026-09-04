import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reportsMocks = vi.hoisted(() => ({ getIncomeExpenseReport: vi.fn() }));
vi.mock("../../lib/api/reports", () => reportsMocks);

const { IncomeExpenseReportPage } = await import("./IncomeExpenseReportPage");

beforeEach(() => {
  reportsMocks.getIncomeExpenseReport.mockReset();
});

describe("IncomeExpenseReportPage — S-REP-01 (FE-F2-08)", () => {
  it("renderiza o comparativo a partir de get_income_expense_report", async () => {
    reportsMocks.getIncomeExpenseReport.mockResolvedValue([{ month: "2026-09-01", income_cents: 500000, expense_cents: 300000 }]);
    render(<IncomeExpenseReportPage />);
    expect(await screen.findByText("Entradas x Saídas")).toBeInTheDocument();
    expect(await screen.findByText(/Dados disponíveis a partir de/)).toBeInTheDocument();
  });

  it("estado de erro exibe Alert quando a RPC falha", async () => {
    reportsMocks.getIncomeExpenseReport.mockRejectedValue(new Error("falhou"));
    render(<IncomeExpenseReportPage />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
