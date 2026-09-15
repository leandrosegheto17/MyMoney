import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reportsMocks = vi.hoisted(() => ({ getNetWorthEvolution: vi.fn() }));
vi.mock("../../lib/api/reports", () => reportsMocks);

const accountsMocks = vi.hoisted(() => ({ listAccounts: vi.fn() }));
vi.mock("../../lib/api/accounts", () => accountsMocks);

const { NetWorthEvolutionReportPage } = await import("./NetWorthEvolutionReportPage");

const ACCOUNTS = [
  { id: "acc-1", name: "Conta Corrente" },
  { id: "acc-2", name: "Poupança" },
];

beforeEach(() => {
  reportsMocks.getNetWorthEvolution.mockReset();
  accountsMocks.listAccounts.mockReset();
  accountsMocks.listAccounts.mockResolvedValue(ACCOUNTS);
});

describe("NetWorthEvolutionReportPage — S-REP-02 (FE-F3-07, RF-F3-05)", () => {
  it("renderiza a evolução consolidada (todas as contas) por padrão", async () => {
    reportsMocks.getNetWorthEvolution.mockResolvedValue([{ month: "2026-09-01", balance_cents: 700000 }]);
    render(<NetWorthEvolutionReportPage />);
    expect(await screen.findByText("Evolução Patrimonial")).toBeInTheDocument();
    expect(await screen.findByText(/Dados disponíveis a partir de/)).toBeInTheDocument();
    expect(reportsMocks.getNetWorthEvolution).toHaveBeenCalledWith(undefined);
  });

  it('filtro "Todas as contas" disponível além de contas individuais (AC literal)', async () => {
    reportsMocks.getNetWorthEvolution.mockResolvedValue([{ month: "2026-09-01", balance_cents: 700000 }]);
    render(<NetWorthEvolutionReportPage />);
    const select = await screen.findByLabelText("Conta");
    const optionLabels = Array.from((select as HTMLSelectElement).options).map((option) => option.textContent);
    expect(optionLabels).toEqual(["Todas as contas", "Conta Corrente", "Poupança"]);
  });

  it("filtrar por conta individual chama get_net_worth_evolution com o account_id selecionado", async () => {
    reportsMocks.getNetWorthEvolution.mockResolvedValue([{ month: "2026-09-01", balance_cents: 200000 }]);
    const user = userEvent.setup();
    render(<NetWorthEvolutionReportPage />);
    const select = await screen.findByLabelText("Conta");
    await waitFor(() => expect(reportsMocks.getNetWorthEvolution).toHaveBeenCalledWith(undefined));

    await user.selectOptions(select, "acc-1");

    await waitFor(() => expect(reportsMocks.getNetWorthEvolution).toHaveBeenCalledWith("acc-1"));
  });

  it("estado de erro exibe Alert quando a RPC falha", async () => {
    reportsMocks.getNetWorthEvolution.mockRejectedValue(new Error("falhou"));
    render(<NetWorthEvolutionReportPage />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("estado de carregamento: mostra Skeleton enquanto a RPC está pendente", async () => {
    reportsMocks.getNetWorthEvolution.mockReturnValue(new Promise(() => {}));
    render(<NetWorthEvolutionReportPage />);
    expect(await screen.findByRole("status", { name: "Carregando relatório" })).toBeInTheDocument();
  });
});
