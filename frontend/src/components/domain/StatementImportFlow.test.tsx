import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatementImportFlow } from "./StatementImportFlow";
import type { StatementImportFlowProps } from "./StatementImportFlow";
import type { StatementImportResult } from "../../lib/api/statementImport";

/** `ReconciliationHint` usa `<Link>` (react-router) — todo render precisa de um Router ao redor. */
function renderFlow(props: StatementImportFlowProps) {
  return render(
    <MemoryRouter>
      <StatementImportFlow {...props} />
    </MemoryRouter>,
  );
}

const accountsMock = vi.hoisted(() => ({ listAccounts: vi.fn() }));
vi.mock("../../lib/api/accounts", () => accountsMock);
const paymentMethodsMock = vi.hoisted(() => ({ listPaymentMethods: vi.fn() }));
vi.mock("../../lib/api/paymentMethods", () => paymentMethodsMock);
const categoriesMock = vi.hoisted(() => ({ listCategories: vi.fn() }));
vi.mock("../../lib/api/categories", () => categoriesMock);
const candidateMock = vi.hoisted(() => ({
  createImportBatch: vi.fn(),
  createCandidateTransaction: vi.fn(),
  confirmCandidateTransaction: vi.fn(),
}));
vi.mock("../../lib/api/candidateTransactions", () => candidateMock);
const statementImportMock = vi.hoisted(() => ({ extractStatementImport: vi.fn() }));
vi.mock("../../lib/api/statementImport", () => statementImportMock);

const ACCOUNT = { id: "acc-1", name: "Conta Corrente" } as const;
const PAYMENT_METHOD = { id: "pm-1", name: "Pix" } as const;
const CATEGORY = { id: "cat-1", name: "Alimentação", parent_category_id: null } as const;

function makeFile(name: string, content = "conteudo do extrato") {
  return new File([content], name, { type: "text/plain" });
}

const RESULT: StatementImportResult = {
  candidates: [
    {
      source: "import",
      raw_payload: { transaction_date: "2026-08-12", amount_cents: 12000, kind: "expense", description: "Supermercado ABC", external_ref: "csv:1" },
      duplicate_of_transaction_id: null,
    },
    {
      source: "import",
      raw_payload: { transaction_date: "2026-08-13", amount_cents: 50000, kind: "income", description: "Transferência recebida", external_ref: "csv:2" },
      duplicate_of_transaction_id: null,
    },
    {
      source: "import",
      raw_payload: { transaction_date: "2026-08-14", amount_cents: 4500, kind: "expense", description: "Restaurante XYZ", external_ref: "csv:3" },
      duplicate_of_transaction_id: "txn-existing-1",
    },
  ],
  total_parsed: 3,
  skipped_lines: 0,
  duplicate_count: 1,
};

async function uploadAndReachReview() {
  renderFlow({ onImported: vi.fn(), onCancel: vi.fn() });
  await waitFor(() => expect(accountsMock.listAccounts).toHaveBeenCalled());

  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Conta" }), "acc-1");
  const fileInput = screen.getByLabelText(/Arquivo do extrato/) as HTMLInputElement;
  await userEvent.upload(fileInput, makeFile("extrato.csv"));
  await userEvent.click(screen.getByRole("button", { name: "Importar" }));

  await screen.findByText(/3 transações encontradas/);
}

describe("StatementImportFlow — S-CAP-06/S-CAP-07 / UX-FL-05, FL-05 (FE-F3-05)", () => {
  beforeEach(() => {
    Object.values(accountsMock).forEach((m) => m.mockReset());
    Object.values(paymentMethodsMock).forEach((m) => m.mockReset());
    Object.values(categoriesMock).forEach((m) => m.mockReset());
    Object.values(candidateMock).forEach((m) => m.mockReset());
    Object.values(statementImportMock).forEach((m) => m.mockReset());

    accountsMock.listAccounts.mockResolvedValue([ACCOUNT]);
    paymentMethodsMock.listPaymentMethods.mockResolvedValue([PAYMENT_METHOD]);
    categoriesMock.listCategories.mockResolvedValue([CATEGORY]);
    statementImportMock.extractStatementImport.mockResolvedValue(RESULT);
    candidateMock.createImportBatch.mockResolvedValue({ id: "batch-1", status: "processing" });
    candidateMock.createCandidateTransaction.mockImplementation(async (input: { raw_payload: { external_ref?: string | null } }) => ({
      id: `cand-${input.raw_payload.external_ref}`,
      status: "pending",
    }));
    candidateMock.confirmCandidateTransaction.mockResolvedValue("txn-new-1");
  });

  it("upload chama /statement-import com o account_id escolhido, o arquivo lido como base64 e o formato detectado pela extensão", async () => {
    await uploadAndReachReview();

    expect(statementImportMock.extractStatementImport).toHaveBeenCalledWith({
      fileContentBase64: expect.any(String),
      fileFormat: "csv",
      accountId: "acc-1",
    });
    const call = statementImportMock.extractStatementImport.mock.calls[0][0];
    expect(atob(call.fileContentBase64)).toBe("conteudo do extrato");
  });

  it("renderiza a lista com o candidato duplicata desmarcado por padrão e os demais marcados (RF-F3-03 AC2)", async () => {
    await uploadAndReachReview();

    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(checkboxes).toHaveLength(3);
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(true);
    expect(checkboxes[2].checked).toBe(false);

    expect(screen.getByText(/3 transações encontradas/)).toHaveTextContent("2 selecionadas");
    expect(screen.getByText("ver lançamento existente")).toBeInTheDocument();
  });

  it("seleção/deseleção individual e em lote ('Selecionar todas'/'Limpar seleção')", async () => {
    await uploadAndReachReview();

    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    await userEvent.click(checkboxes[2]);
    expect(screen.getByText(/3 selecionadas/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Limpar seleção" }));
    expect(screen.getByText(/0 selecionadas/)).toBeInTheDocument();
    expect(checkboxes.every((box) => !box.checked)).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Selecionar todas" }));
    expect(screen.getByText(/3 selecionadas/)).toBeInTheDocument();
    expect(checkboxes.every((box) => box.checked)).toBe(true);
  });

  it("'Confirmar N lançamentos' só habilita com seleção não-vazia E forma de pagamento E categoria do lote preenchidas", async () => {
    await uploadAndReachReview();

    const confirmButton = screen.getByRole("button", { name: /Confirmar 2 lançamentos/ });
    expect(confirmButton).toBeDisabled();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Forma de pagamento (aplica à seleção)" }), "pm-1");
    expect(confirmButton).toBeDisabled();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Categoria (aplica à seleção)" }), "cat-1");
    expect(confirmButton).not.toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Limpar seleção" }));
    expect(screen.getByRole("button", { name: /Confirmar 0 lançamentos/ })).toBeDisabled();
  });

  it("nenhuma chamada de persistência (import_batch/candidate_transaction/confirm) acontece antes do clique em 'Confirmar' (AC3)", async () => {
    await uploadAndReachReview();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Forma de pagamento (aplica à seleção)" }), "pm-1");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Categoria (aplica à seleção)" }), "cat-1");

    expect(candidateMock.createImportBatch).not.toHaveBeenCalled();
    expect(candidateMock.createCandidateTransaction).not.toHaveBeenCalled();
    expect(candidateMock.confirmCandidateTransaction).not.toHaveBeenCalled();
  });

  it("confirmação chama POST /import_batch, depois POST /candidate_transaction + POST /rpc/confirm_candidate_transaction por item selecionado, na ordem certa", async () => {
    const onImported = vi.fn();
    renderFlow({ onImported, onCancel: vi.fn() });
    await waitFor(() => expect(accountsMock.listAccounts).toHaveBeenCalled());
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Conta" }), "acc-1");
    await userEvent.upload(screen.getByLabelText(/Arquivo do extrato/), makeFile("extrato.csv"));
    await userEvent.click(screen.getByRole("button", { name: "Importar" }));
    await screen.findByText(/3 transações encontradas/);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Forma de pagamento (aplica à seleção)" }), "pm-1");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Categoria (aplica à seleção)" }), "cat-1");

    const callOrder: string[] = [];
    candidateMock.createImportBatch.mockImplementation(async () => {
      callOrder.push("import_batch");
      return { id: "batch-1", status: "processing" };
    });
    candidateMock.createCandidateTransaction.mockImplementation(async (input: { raw_payload: { external_ref?: string | null } }) => {
      callOrder.push(`candidate:${input.raw_payload.external_ref}`);
      return { id: `cand-${input.raw_payload.external_ref}`, status: "pending" };
    });
    candidateMock.confirmCandidateTransaction.mockImplementation(async (params: { p_candidate_id: string }) => {
      callOrder.push(`confirm:${params.p_candidate_id}`);
      return "txn-new";
    });

    await userEvent.click(screen.getByRole("button", { name: /Confirmar 2 lançamentos/ }));

    await waitFor(() => expect(onImported).toHaveBeenCalledWith(2));

    expect(candidateMock.createImportBatch).toHaveBeenCalledWith(expect.objectContaining({ source: "import" }));
    expect(candidateMock.createCandidateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ source: "import", import_batch_id: "batch-1", duplicate_of_transaction_id: null }),
    );
    expect(candidateMock.confirmCandidateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        p_account_id: "acc-1",
        p_payment_method_id: "pm-1",
        p_category_id: "cat-1",
        p_kind: "expense",
        p_amount_cents: 12000,
        p_transaction_date: "2026-08-12",
      }),
    );
    // O terceiro candidato (duplicata) nunca foi confirmado — veio desmarcado e nunca foi selecionado neste teste.
    expect(callOrder).toEqual([
      "import_batch",
      "candidate:csv:1",
      "confirm:cand-csv:1",
      "candidate:csv:2",
      "confirm:cand-csv:2",
    ]);
  });

  it("falha parcial no meio do lote não perde os já confirmados e mostra erro claro, mantendo o item que falhou para nova tentativa", async () => {
    const onImported = vi.fn();
    renderFlow({ onImported, onCancel: vi.fn() });
    await waitFor(() => expect(accountsMock.listAccounts).toHaveBeenCalled());
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Conta" }), "acc-1");
    await userEvent.upload(screen.getByLabelText(/Arquivo do extrato/), makeFile("extrato.csv"));
    await userEvent.click(screen.getByRole("button", { name: "Importar" }));
    await screen.findByText(/3 transações encontradas/);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Forma de pagamento (aplica à seleção)" }), "pm-1");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Categoria (aplica à seleção)" }), "cat-1");

    // O 2º candidato selecionado (csv:2) falha ao confirmar; o 1º (csv:1) segue confirmado normalmente.
    candidateMock.confirmCandidateTransaction.mockImplementation(async (params: { p_candidate_id: string }) => {
      if (params.p_candidate_id === "cand-csv:2") {
        throw new Error("network down");
      }
      return "txn-ok";
    });

    await userEvent.click(screen.getByRole("button", { name: /Confirmar 2 lançamentos/ }));

    await waitFor(() => expect(screen.getByText(/1 não puderam ser importados/)).toBeInTheDocument());
    // Já confirmado (csv:1) nunca é "desconfirmado" — a chamada aconteceu e não há tentativa de reverter.
    expect(candidateMock.confirmCandidateTransaction).toHaveBeenCalledWith(expect.objectContaining({ p_candidate_id: "cand-csv:1" }));
    expect(onImported).not.toHaveBeenCalled();
    // O item que falhou (csv:2) e o que nunca foi selecionado (csv:3, duplicata) continuam na
    // lista — só o já confirmado (csv:1) sai; csv:2 permanece selecionado, pronto para nova tentativa.
    expect(screen.getByText(/2 transações encontradas/)).toBeInTheDocument();
    expect(screen.getByText(/1 selecionadas/)).toBeInTheDocument();
  });
});
