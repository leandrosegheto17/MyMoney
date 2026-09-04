import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/base/Toast";

const goalsMocks = vi.hoisted(() => ({
  listGoals: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
  getGoalsProgress: vi.fn(),
  listContributions: vi.fn(),
  createContribution: vi.fn(),
  deleteContribution: vi.fn(),
}));
vi.mock("../../lib/api/goals", () => goalsMocks);

const { GoalsPage } = await import("./GoalsPage");

const GOAL = {
  id: "g1",
  user_id: "u1",
  name: "Viagem",
  target_amount_cents: 1000000,
  target_date: null,
  is_active: true,
  created_at: "x",
  updated_at: "x",
};

function renderPage() {
  return render(
    <ToastProvider>
      <GoalsPage />
    </ToastProvider>,
  );
}

beforeEach(() => {
  Object.values(goalsMocks).forEach((mock) => mock.mockReset());
});

describe("GoalsPage — S-GOAL-01/02/03/04 (FE-F2-06)", () => {
  it("estado vazio: sem metas, mostra EmptyState", async () => {
    goalsMocks.listGoals.mockResolvedValue([]);
    goalsMocks.getGoalsProgress.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Nenhuma meta cadastrada ainda")).toBeInTheDocument();
  });

  it("lista meta com progresso calculado pelo servidor (get_goals_progress)", async () => {
    goalsMocks.listGoals.mockResolvedValue([GOAL]);
    goalsMocks.getGoalsProgress.mockResolvedValue([
      { goal_id: "g1", name: "Viagem", target_amount_cents: 1000000, target_date: null, is_active: true, current_amount_cents: 300000, pct_progress: 30 },
    ]);
    renderPage();
    expect(await screen.findByText("30% da meta")).toBeInTheDocument();
    expect(screen.getByText(/R\$ 3\.000,00 de R\$ 10\.000,00/)).toBeInTheDocument();
  });

  it("registrar aporte recarrega o progresso ao vivo (AC: recalculado a cada aporte)", async () => {
    goalsMocks.listGoals.mockResolvedValue([GOAL]);
    goalsMocks.getGoalsProgress
      .mockResolvedValueOnce([{ goal_id: "g1", name: "Viagem", target_amount_cents: 1000000, target_date: null, is_active: true, current_amount_cents: 300000, pct_progress: 30 }])
      .mockResolvedValueOnce([{ goal_id: "g1", name: "Viagem", target_amount_cents: 1000000, target_date: null, is_active: true, current_amount_cents: 300000, pct_progress: 30 }])
      .mockResolvedValue([{ goal_id: "g1", name: "Viagem", target_amount_cents: 1000000, target_date: null, is_active: true, current_amount_cents: 400000, pct_progress: 40 }]);
    goalsMocks.listContributions.mockResolvedValue([]);
    goalsMocks.createContribution.mockResolvedValue({ id: "ctb-1", goal_id: "g1", user_id: "u1", amount_cents: 100000, contribution_date: "2026-09-03", created_at: "x" });
    renderPage();

    await userEvent.click(await screen.findByText("Viagem"));
    await userEvent.click(await screen.findByRole("button", { name: "+ Registrar aporte" }));

    const dialog = await screen.findByRole("dialog", { name: "Registrar aporte" });
    const input = dialog.querySelector("input") as HTMLInputElement;
    await userEvent.type(input, "100000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(goalsMocks.createContribution).toHaveBeenCalledWith(expect.objectContaining({ goal_id: "g1", amount_cents: 100000 })));
    expect(await screen.findByText("40% da meta")).toBeInTheDocument();
  });

  it("estado de carregamento: mostra Skeleton enquanto listGoals está pendente (QA-F2-02)", async () => {
    goalsMocks.listGoals.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(await screen.findByRole("status", { name: "Carregando metas" })).toBeInTheDocument();
  });

  it("estado de erro: mostra Alert quando listGoals falha (QA-F2-02)", async () => {
    goalsMocks.listGoals.mockRejectedValue(new Error("falhou"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar as metas.");
  });
});
