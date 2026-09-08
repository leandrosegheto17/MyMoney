import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DraftReviewBanner } from "./DraftReviewBanner";
import type { DraftSource } from "./DraftReviewBanner";
import type { VoiceExtractionResult } from "../../lib/api/voiceCapture";
import type { ReceiptExtractionResult } from "../../lib/api/receiptOcr";

const accountsMock = vi.hoisted(() => ({ listAccounts: vi.fn() }));
vi.mock("../../lib/api/accounts", () => accountsMock);
const paymentMethodsMock = vi.hoisted(() => ({ listPaymentMethods: vi.fn() }));
vi.mock("../../lib/api/paymentMethods", () => paymentMethodsMock);
const categoriesMock = vi.hoisted(() => ({ listCategories: vi.fn() }));
vi.mock("../../lib/api/categories", () => categoriesMock);
const candidateMock = vi.hoisted(() => ({
  createCandidateTransaction: vi.fn(),
  deleteCandidateTransaction: vi.fn(),
  confirmCandidateTransaction: vi.fn(),
}));
vi.mock("../../lib/api/candidateTransactions", () => candidateMock);

const ACCOUNT = { id: "acc-1", name: "Conta Corrente" } as const;
const PAYMENT_METHOD = { id: "pm-1", name: "Pix" } as const;
const CATEGORY_ALIMENTACAO = { id: "cat-1", name: "Alimentação", parent_category_id: null } as const;
const CANDIDATE = { id: "cand-1", status: "pending" } as const;

const VOICE_RESULT: VoiceExtractionResult = {
  amount_cents: { value: 4500, confidence: 0.9 },
  transaction_date: { value: "2026-09-07", confidence: 0.4 },
  type: { value: "saida", confidence: 0.8 },
  description: { value: "mercado", confidence: 0.7 },
  category_suggestion_label: { value: "Alimentação", confidence: 0.6 },
  transcript: "gastei 45 reais no mercado hoje",
  suggestion_disclaimer: "sugestão automática, não confirmada",
};

function voiceSource(overrides: Partial<VoiceExtractionResult> = {}): DraftSource {
  return { kind: "voice", extraction: { ...VOICE_RESULT, ...overrides } };
}

function photoSource(extraction: ReceiptExtractionResult = {}): DraftSource {
  return { kind: "photo", extraction, image: { base64: "ZmFrZQ==", mimeType: "image/jpeg" } };
}

describe("DraftReviewBanner — S-CAP-03/S-CAP-05 / UX-FL-04 (FE-F3-04, RNF-01/RNF-08, DIR-20)", () => {
  beforeEach(() => {
    Object.values(accountsMock).forEach((m) => m.mockReset());
    Object.values(paymentMethodsMock).forEach((m) => m.mockReset());
    Object.values(categoriesMock).forEach((m) => m.mockReset());
    Object.values(candidateMock).forEach((m) => m.mockReset());
    accountsMock.listAccounts.mockResolvedValue([ACCOUNT]);
    paymentMethodsMock.listPaymentMethods.mockResolvedValue([PAYMENT_METHOD]);
    categoriesMock.listCategories.mockResolvedValue([CATEGORY_ALIMENTACAO]);
    candidateMock.createCandidateTransaction.mockResolvedValue(CANDIDATE);
    candidateMock.deleteCandidateTransaction.mockResolvedValue(undefined);
    candidateMock.confirmCandidateTransaction.mockResolvedValue("txn-1");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mostra o banner fixo 'RASCUNHO' e o texto 'Nada é salvo até você confirmar'", async () => {
    render(<DraftReviewBanner source={voiceSource()} onConfirmed={vi.fn()} onDiscarded={vi.fn()} />);
    expect(await screen.findByText(/RASCUNHO — revise antes de salvar/)).toBeInTheDocument();
    expect(screen.getByText("Nada é salvo até você confirmar.")).toBeInTheDocument();
  });

  it("cria o candidate_transaction (source=audio) assim que monta, com o raw_payload da extração de voz", async () => {
    render(<DraftReviewBanner source={voiceSource()} onConfirmed={vi.fn()} onDiscarded={vi.fn()} />);
    await waitFor(() =>
      expect(candidateMock.createCandidateTransaction).toHaveBeenCalledWith({
        source: "audio",
        raw_payload: VOICE_RESULT,
      }),
    );
  });

  it("cria o candidate_transaction (source=ocr) para captura por foto e exibe a miniatura do recibo", async () => {
    render(<DraftReviewBanner source={photoSource({ amount_cents: { value: 1000, confidence: 0.5 } })} onConfirmed={vi.fn()} onDiscarded={vi.fn()} />);
    await waitFor(() =>
      expect(candidateMock.createCandidateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ source: "ocr" }),
      ),
    );
    expect(screen.getByAltText("Foto do recibo enviada para leitura")).toBeInTheDocument();
  });

  it("campos extraídos (Data/Valor/Tipo/Categoria/Descrição) mostram AutoFillTag; Conta/Forma de pagamento nunca mostram (contrato não sugere esses 2 campos)", async () => {
    render(<DraftReviewBanner source={voiceSource()} onConfirmed={vi.fn()} onDiscarded={vi.fn()} />);
    await waitFor(() => expect(categoriesMock.listCategories).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByText("✨ sugerido").length).toBeGreaterThanOrEqual(4));

    const accountField = screen.getByRole("combobox", { name: "Conta" }).closest("div")!.parentElement!;
    expect(within(accountField).queryByText("✨ sugerido")).not.toBeInTheDocument();
  });

  it("editar o campo Valor remove só a tag de Valor, mantendo a de Data/Categoria/Descrição intactas (RF-F3-01 AC3 — por campo, não global)", async () => {
    render(<DraftReviewBanner source={voiceSource()} onConfirmed={vi.fn()} onDiscarded={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByText("✨ sugerido").length).toBeGreaterThanOrEqual(4));
    const tagsBefore = screen.getAllByText("✨ sugerido").length;

    const amountInput = screen.getByLabelText("Valor", { exact: false });
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, "9");

    await waitFor(() => expect(screen.getAllByText("✨ sugerido").length).toBe(tagsBefore - 1));
  });

  it("apenas focar um campo (sem alterar o valor) não remove a tag", async () => {
    render(<DraftReviewBanner source={voiceSource()} onConfirmed={vi.fn()} onDiscarded={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByText("✨ sugerido").length).toBeGreaterThanOrEqual(4));
    const tagsBefore = screen.getAllByText("✨ sugerido").length;

    screen.getByLabelText("Descrição").focus();
    expect(screen.getByLabelText("Descrição")).toHaveFocus();

    expect(screen.getAllByText("✨ sugerido").length).toBe(tagsBefore);
  });

  it("captura por foto sem 'type' extraído assume Saída sem AutoFillTag (decisão documentada, não é sugestão do contrato)", async () => {
    render(<DraftReviewBanner source={photoSource()} onConfirmed={vi.fn()} onDiscarded={vi.fn()} />);
    await screen.findByRole("button", { name: "Saída" });
    // "Saída" já selecionada (variant primary) — sem tag ao lado do grupo Tipo.
    const typeGroup = screen.getByRole("group", { name: "Tipo de lançamento" });
    expect(within(typeGroup).queryByText("✨ sugerido")).not.toBeInTheDocument();
  });

  it("campo obrigatório não extraído (ex. descrição em branco na foto sem estabelecimento) mostra AutoFillAttentionHint, não erro", async () => {
    render(<DraftReviewBanner source={photoSource()} onConfirmed={vi.fn()} onDiscarded={vi.fn()} />);
    await waitFor(() => expect(categoriesMock.listCategories).toHaveBeenCalled());
    expect(await screen.findAllByText("⚠ preencha")).not.toHaveLength(0);
  });

  it("casa category_suggestion_label com uma categoria real do usuário (match exato case-insensitive) e marca AutoFillTag", async () => {
    render(<DraftReviewBanner source={voiceSource()} onConfirmed={vi.fn()} onDiscarded={vi.fn()} />);
    await waitFor(() => {
      const selects = screen.getAllByRole("combobox");
      const categorySelect = selects.find((el) => (el as HTMLSelectElement).value === "cat-1");
      expect(categorySelect).toBeDefined();
    });
  });

  it("botão 'Confirmar lançamento' só habilita quando todos os campos obrigatórios estão preenchidos", async () => {
    render(<DraftReviewBanner source={voiceSource()} onConfirmed={vi.fn()} onDiscarded={vi.fn()} />);
    await waitFor(() => expect(candidateMock.createCandidateTransaction).toHaveBeenCalled());

    const confirmButton = screen.getByRole("button", { name: "Confirmar lançamento" });
    expect(confirmButton).toBeDisabled();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Conta" }), "acc-1");
    expect(confirmButton).toBeDisabled();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Forma de pagamento" }), "pm-1");

    await waitFor(() => expect(confirmButton).not.toBeDisabled());
  });

  it("'Confirmar lançamento' chama confirm_candidate_transaction com os valores finais e onConfirmed com o id da Transaction", async () => {
    const onConfirmed = vi.fn();
    render(<DraftReviewBanner source={voiceSource()} onConfirmed={onConfirmed} onDiscarded={vi.fn()} />);
    await waitFor(() => expect(candidateMock.createCandidateTransaction).toHaveBeenCalled());

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Conta" }), "acc-1");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Forma de pagamento" }), "pm-1");

    const confirmButton = screen.getByRole("button", { name: "Confirmar lançamento" });
    await waitFor(() => expect(confirmButton).not.toBeDisabled());
    await userEvent.click(confirmButton);

    await waitFor(() =>
      expect(candidateMock.confirmCandidateTransaction).toHaveBeenCalledWith({
        p_candidate_id: "cand-1",
        p_account_id: "acc-1",
        p_payment_method_id: "pm-1",
        p_category_id: "cat-1",
        p_kind: "expense",
        p_amount_cents: 4500,
        p_transaction_date: "2026-09-07",
        p_description: "mercado",
      }),
    );
    expect(onConfirmed).toHaveBeenCalledWith("txn-1");
  });

  it("falha ao confirmar mostra erro inline e preserva os valores digitados/editados (nunca perde o rascunho silenciosamente)", async () => {
    candidateMock.confirmCandidateTransaction.mockRejectedValue(new Error("network down"));
    render(<DraftReviewBanner source={voiceSource()} onConfirmed={vi.fn()} onDiscarded={vi.fn()} />);
    await waitFor(() => expect(candidateMock.createCandidateTransaction).toHaveBeenCalled());

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Conta" }), "acc-1");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Forma de pagamento" }), "pm-1");
    const descriptionInput = screen.getByLabelText("Descrição");
    await userEvent.clear(descriptionInput);
    await userEvent.type(descriptionInput, "editado pelo usuário");

    const confirmButton = screen.getByRole("button", { name: "Confirmar lançamento" });
    await waitFor(() => expect(confirmButton).not.toBeDisabled());
    await userEvent.click(confirmButton);

    expect((await screen.findAllByText(/Não foi possível confirmar o lançamento/)).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Descrição")).toHaveValue("editado pelo usuário");
  });

  it("'Cancelar' exclui fisicamente o candidato pendente (DELETE, sem ConfirmationDialog) e chama onDiscarded", async () => {
    const onDiscarded = vi.fn();
    render(<DraftReviewBanner source={voiceSource()} onConfirmed={vi.fn()} onDiscarded={onDiscarded} />);
    await waitFor(() => expect(candidateMock.createCandidateTransaction).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(candidateMock.deleteCandidateTransaction).toHaveBeenCalledWith("cand-1"));
    expect(onDiscarded).toHaveBeenCalledTimes(1);
    // Nenhum ConfirmationDialog intermediário — nenhum diálogo secundário de "tem certeza".
    expect(screen.queryByText(/tem certeza/i)).not.toBeInTheDocument();
  });

  it("'Cancelar' antes do candidato terminar de ser criado não chama a API — apenas descarta localmente", async () => {
    let resolveCreate!: (value: typeof CANDIDATE) => void;
    candidateMock.createCandidateTransaction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const onDiscarded = vi.fn();
    render(<DraftReviewBanner source={voiceSource()} onConfirmed={vi.fn()} onDiscarded={onDiscarded} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(candidateMock.deleteCandidateTransaction).not.toHaveBeenCalled();
    expect(onDiscarded).toHaveBeenCalledTimes(1);
    resolveCreate(CANDIDATE);
  });

  it("falha ao descartar mostra erro inline e mantém o banner aberto (nunca perde o rascunho silenciosamente)", async () => {
    candidateMock.deleteCandidateTransaction.mockRejectedValue(new Error("offline"));
    const onDiscarded = vi.fn();
    render(<DraftReviewBanner source={voiceSource()} onConfirmed={vi.fn()} onDiscarded={onDiscarded} />);
    await waitFor(() => expect(candidateMock.createCandidateTransaction).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect((await screen.findAllByText(/Não foi possível descartar o rascunho/)).length).toBeGreaterThan(0);
    expect(onDiscarded).not.toHaveBeenCalled();
  });

  it("falha ao criar o candidato mostra erro com 'Tentar novamente', sem perder os campos já derivados da extração", async () => {
    candidateMock.createCandidateTransaction.mockRejectedValueOnce(new Error("network down"));
    render(<DraftReviewBanner source={voiceSource()} onConfirmed={vi.fn()} onDiscarded={vi.fn()} />);

    expect((await screen.findAllByText(/Não foi possível salvar o rascunho/)).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Valor", { exact: false })).toHaveValue("R$ 45,00");

    candidateMock.createCandidateTransaction.mockResolvedValueOnce(CANDIDATE);
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    await waitFor(() => expect(screen.queryAllByText(/Não foi possível salvar o rascunho/)).toHaveLength(0));
  });

  it("AC crítico de RNF-01/WCAG 2.2.1 — nenhum timer/auto-confirmação/navegação automática mesmo decorrido muito tempo", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onConfirmed = vi.fn();
    const onDiscarded = vi.fn();
    render(<DraftReviewBanner source={voiceSource()} onConfirmed={onConfirmed} onDiscarded={onDiscarded} />);

    await vi.waitFor(() => expect(candidateMock.createCandidateTransaction).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

    expect(candidateMock.confirmCandidateTransaction).not.toHaveBeenCalled();
    expect(candidateMock.deleteCandidateTransaction).not.toHaveBeenCalled();
    expect(candidateMock.createCandidateTransaction).toHaveBeenCalledTimes(1);
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(onDiscarded).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirmar lançamento" })).toBeInTheDocument();

    vi.useRealTimers();
  });
});
