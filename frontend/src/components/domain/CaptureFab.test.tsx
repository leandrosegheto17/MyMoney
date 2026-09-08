import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../base/Toast";
import { CaptureFab } from "./CaptureFab";

const voiceCaptureMock = vi.hoisted(() => ({ extractVoiceCapture: vi.fn() }));
vi.mock("../../lib/api/voiceCapture", () => voiceCaptureMock);
const receiptOcrMock = vi.hoisted(() => ({ extractReceiptOcr: vi.fn() }));
vi.mock("../../lib/api/receiptOcr", () => receiptOcrMock);
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

vi.mock("../../lib/receiptImage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/receiptImage")>();
  return {
    ...actual,
    // jsdom não implementa canvas 2D (`getContext` retorna `null`) — mesmo duplo de
    // teste de `ReceiptCameraCapture.test.tsx` (FE-F3-03).
    captureVideoFrame: vi.fn(() => "data:image/jpeg;base64,ZmFrZS1qcGVn"),
  };
});

function makeCameraStream() {
  return { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: "/", element: <CaptureFab compact={false} /> },
      { path: "/lancamentos", element: <p>Tela de lançamentos</p> },
    ],
    { initialEntries: [path] },
  );
  return render(
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>,
  );
}

describe("CaptureFab — S-CAP-01 / UX-FL-04 (FE-F3-01/02/03/04)", () => {
  const originalSpeechRecognition = (window as typeof window & { SpeechRecognition?: unknown }).SpeechRecognition;
  const originalWebkitSpeechRecognition = (window as typeof window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

  beforeEach(() => {
    Object.values(voiceCaptureMock).forEach((m) => m.mockReset());
    Object.values(receiptOcrMock).forEach((m) => m.mockReset());
    Object.values(accountsMock).forEach((m) => m.mockReset());
    Object.values(paymentMethodsMock).forEach((m) => m.mockReset());
    Object.values(categoriesMock).forEach((m) => m.mockReset());
    Object.values(candidateMock).forEach((m) => m.mockReset());
    accountsMock.listAccounts.mockResolvedValue([]);
    paymentMethodsMock.listPaymentMethods.mockResolvedValue([]);
    categoriesMock.listCategories.mockResolvedValue([]);
    candidateMock.createCandidateTransaction.mockResolvedValue({ id: "cand-1", status: "pending" });
  });

  afterEach(() => {
    (window as typeof window & { SpeechRecognition?: unknown }).SpeechRecognition = originalSpeechRecognition;
    (window as typeof window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = originalWebkitSpeechRecognition;
  });

  describe("Web Speech API indisponível (nem SpeechRecognition, nem webkitSpeechRecognition)", () => {
    beforeEach(() => {
      delete (window as typeof window & { SpeechRecognition?: unknown }).SpeechRecognition;
      delete (window as typeof window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    });

    it("sempre mostra as 3 opções, com 'Falar' presente porém desabilitada com o texto explicativo (AC literal de FE-F3-01)", async () => {
      renderAt("/");
      await userEvent.click(screen.getByRole("button", { name: "Novo lançamento" }));

      expect(await screen.findByRole("menuitem", { name: "Lançamento manual" })).toBeInTheDocument();
      expect(await screen.findByRole("menuitem", { name: "Fotografar" })).toBeInTheDocument();

      const speakOption = await screen.findByRole("menuitem", { name: /Falar/ });
      expect(speakOption).toBeInTheDocument();
      expect(speakOption).toHaveAttribute("aria-disabled", "true");
      expect(speakOption).not.toHaveAttribute("disabled");
      expect(speakOption).toHaveTextContent("Não disponível neste navegador");
    });

    it("'Falar' desabilitada continua navegável por teclado (tab alcança o item) e não dispara nenhuma ação ao ser ativada", async () => {
      renderAt("/");
      await userEvent.click(screen.getByRole("button", { name: "Novo lançamento" }));
      const speakOption = await screen.findByRole("menuitem", { name: /Falar/ });

      speakOption.focus();
      expect(speakOption).toHaveFocus();

      await userEvent.keyboard("{Enter}");
      // Menu continua aberto — nenhuma navegação/fechamento disparados pela opção desabilitada.
      expect(await screen.findByRole("menuitem", { name: "Lançamento manual" })).toBeInTheDocument();
    });
  });

  describe("Web Speech API disponível (mock de SpeechRecognition)", () => {
    beforeEach(() => {
      (window as typeof window & { SpeechRecognition?: unknown }).SpeechRecognition = function MockSpeechRecognition() {
        return { start() {}, stop() {} };
      };
    });

    it("mostra 'Falar' habilitada (sem aria-disabled) junto das outras 2 opções", async () => {
      renderAt("/");
      await userEvent.click(screen.getByRole("button", { name: "Novo lançamento" }));

      const speakOption = await screen.findByRole("menuitem", { name: "Falar" });
      expect(speakOption).toHaveAttribute("aria-disabled", "false");
      expect(speakOption).not.toHaveTextContent("Não disponível neste navegador");
    });

    it("clicar em 'Falar' habilitada troca o conteúdo do modal para VoiceRecorderUI (S-CAP-02, FE-F3-02), sem navegar para rota inexistente", async () => {
      renderAt("/");
      await userEvent.click(screen.getByRole("button", { name: "Novo lançamento" }));
      await userEvent.click(await screen.findByRole("menuitem", { name: "Falar" }));

      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(screen.queryByText("Tela de lançamentos")).not.toBeInTheDocument();
      expect(await screen.findByRole("heading", { name: "Falar lançamento" })).toBeInTheDocument();
      expect(await screen.findByText("Ouvindo...")).toBeInTheDocument();
    });

  });

  describe("concluir a captura de voz abre o DraftReviewBanner (S-CAP-03, FE-F3-04)", () => {
    class FakeSpeechRecognitionWithResult {
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {}
      stop() {
        this.onend?.();
      }
    }
    let instance: FakeSpeechRecognitionWithResult;

    beforeEach(() => {
      instance = new FakeSpeechRecognitionWithResult();
      (window as typeof window & { SpeechRecognition?: unknown }).SpeechRecognition = function () {
        return instance;
      };
    });

    it("abre o rascunho fixo (não-dismissible) com o resultado extraído de /voice-capture", async () => {
      voiceCaptureMock.extractVoiceCapture.mockResolvedValue({
        amount_cents: { value: 4500, confidence: 0.9 },
        transaction_date: { value: "2026-09-07", confidence: 0.4 },
        type: { value: "saida", confidence: 0.8 },
        description: { value: "mercado", confidence: 0.7 },
        category_suggestion_label: null,
        transcript: "gastei 45 reais no mercado",
        suggestion_disclaimer: "sugestão automática, não confirmada",
      });

      renderAt("/");
      await userEvent.click(screen.getByRole("button", { name: "Novo lançamento" }));
      await userEvent.click(await screen.findByRole("menuitem", { name: "Falar" }));

      instance.onresult?.({
        resultIndex: 0,
        results: { length: 1, 0: { isFinal: true, length: 1, 0: { transcript: "gastei 45 reais no mercado" } } },
      });
      await userEvent.click(await screen.findByRole("button", { name: "Concluir gravação" }));

      expect(await screen.findByRole("heading", { name: "Revisar lançamento" })).toBeInTheDocument();
      expect(await screen.findByText(/RASCUNHO — revise antes de salvar/)).toBeInTheDocument();
      // Banner fixo: sem botão "Fechar" (✕) do cabeçalho do Modal.
      expect(screen.queryByRole("button", { name: "Fechar" })).not.toBeInTheDocument();

      await waitFor(() => expect(candidateMock.createCandidateTransaction).toHaveBeenCalledWith(expect.objectContaining({ source: "audio" })));

      // Esc não fecha o rascunho (critério de aceite literal — não-descartável até ação explícita).
      await userEvent.keyboard("{Escape}");
      expect(await screen.findByRole("heading", { name: "Revisar lançamento" })).toBeInTheDocument();
    });
  });

  it("'Lançamento manual' navega para /lancamentos (RN-20, mesmo destino de sempre)", async () => {
    renderAt("/");
    await userEvent.click(screen.getByRole("button", { name: "Novo lançamento" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Lançamento manual" }));

    expect(await screen.findByText("Tela de lançamentos")).toBeInTheDocument();
  });

  it("'Fotografar' troca o conteúdo do modal para ReceiptCameraCapture (S-CAP-04, FE-F3-03), sem navegar para rota inexistente", async () => {
    renderAt("/");
    await userEvent.click(screen.getByRole("button", { name: "Novo lançamento" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Fotografar" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByText("Tela de lançamentos")).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Fotografar recibo" })).toBeInTheDocument();
    // Upload de arquivo sempre visível, mesmo sem qualquer erro de câmera ainda ter ocorrido.
    expect(await screen.findByLabelText("Selecionar arquivo")).toBeInTheDocument();
  });

  it("Cancelar dentro de ReceiptCameraCapture fecha o modal por completo (volta a poder reabrir o menu do zero)", async () => {
    renderAt("/");
    await userEvent.click(screen.getByRole("button", { name: "Novo lançamento" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Fotografar" }));
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Novo lançamento" }));
    expect(await screen.findByRole("menuitem", { name: "Lançamento manual" })).toBeInTheDocument();
  });

  describe("câmera concedida (getUserMedia resolve) — confirmação de foto (FE-F3-04)", () => {
    const originalMediaDevices = navigator.mediaDevices;

    beforeEach(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: { getUserMedia: vi.fn().mockResolvedValue(makeCameraStream()) },
      });
    });

    afterEach(() => {
      Object.defineProperty(navigator, "mediaDevices", { value: originalMediaDevices, configurable: true });
    });

  it("confirmar a foto chama /receipt-ocr de verdade, mostra 'Lendo o recibo...' e depois abre o DraftReviewBanner com o resultado", async () => {
    let resolveExtraction!: (value: { amount_cents: { value: number; confidence: number } }) => void;
    receiptOcrMock.extractReceiptOcr.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveExtraction = resolve;
        }),
    );

    renderAt("/");
    await userEvent.click(screen.getByRole("button", { name: "Novo lançamento" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Fotografar" }));
    await userEvent.click(await screen.findByRole("button", { name: /Capturar foto/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Usar esta foto" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Lendo o recibo...");
    expect(receiptOcrMock.extractReceiptOcr).toHaveBeenCalledWith({ base64: "ZmFrZS1qcGVn", mimeType: "image/jpeg" });

    resolveExtraction({ amount_cents: { value: 6000, confidence: 0.8 } });

    expect(await screen.findByRole("heading", { name: "Revisar lançamento" })).toBeInTheDocument();
    await waitFor(() =>
      expect(candidateMock.createCandidateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ source: "ocr", raw_payload: { amount_cents: { value: 6000, confidence: 0.8 } } }),
      ),
    );
    expect(screen.getByAltText("Foto do recibo enviada para leitura")).toBeInTheDocument();
  });

  it("falha total do OCR (rede/502/503) nunca bloqueia o usuário — abre o rascunho com todos os campos em branco (UX-SPEC S-CAP-04, RF-F3-02 AC3)", async () => {
    receiptOcrMock.extractReceiptOcr.mockRejectedValue(new Error("ocr_provider_failed"));

    renderAt("/");
    await userEvent.click(screen.getByRole("button", { name: "Novo lançamento" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Fotografar" }));
    await userEvent.click(await screen.findByRole("button", { name: /Capturar foto/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Usar esta foto" }));

    expect(await screen.findByRole("heading", { name: "Revisar lançamento" })).toBeInTheDocument();
    await waitFor(() =>
      expect(candidateMock.createCandidateTransaction).toHaveBeenCalledWith(expect.objectContaining({ source: "ocr", raw_payload: {} })),
    );
  });

  it("confirmar o lançamento no rascunho mostra toast de sucesso e fecha o modal por completo", async () => {
    receiptOcrMock.extractReceiptOcr.mockResolvedValue({});
    candidateMock.confirmCandidateTransaction.mockResolvedValue("txn-1");
    accountsMock.listAccounts.mockResolvedValue([{ id: "acc-1", name: "Conta Corrente" }]);
    paymentMethodsMock.listPaymentMethods.mockResolvedValue([{ id: "pm-1", name: "Pix" }]);
    categoriesMock.listCategories.mockResolvedValue([{ id: "cat-1", name: "Alimentação", parent_category_id: null }]);

    renderAt("/");
    await userEvent.click(screen.getByRole("button", { name: "Novo lançamento" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Fotografar" }));
    await userEvent.click(await screen.findByRole("button", { name: /Capturar foto/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Usar esta foto" }));
    await screen.findByRole("heading", { name: "Revisar lançamento" });

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Conta" }), "acc-1");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Forma de pagamento" }), "pm-1");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Categoria" }), "cat-1");
    await userEvent.type(screen.getByLabelText("Valor", { exact: false }), "5000");

    const confirmButton = await screen.findByRole("button", { name: "Confirmar lançamento" });
    await waitFor(() => expect(confirmButton).not.toBeDisabled());
    await userEvent.click(confirmButton);

    expect(await screen.findByText("Lançamento confirmado com sucesso.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  });

  it("renderiza como ícone circular compacto quando compact=true, sem rótulo de texto visível", async () => {
    const router = createMemoryRouter([{ path: "/", element: <CaptureFab compact /> }], { initialEntries: ["/"] });
    render(
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>,
    );
    const trigger = screen.getByRole("button", { name: "Novo lançamento" });
    expect(trigger.className).toContain("rounded-full");
    expect(trigger).not.toHaveTextContent("Novo lançamento");
  });
});
