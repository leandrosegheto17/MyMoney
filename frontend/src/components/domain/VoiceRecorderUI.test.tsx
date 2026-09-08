import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceRecorderUI } from "./VoiceRecorderUI";
import { extractVoiceCapture } from "../../lib/api/voiceCapture";
import type { VoiceExtractionResult } from "../../lib/api/voiceCapture";

vi.mock("../../lib/api/voiceCapture", () => ({
  extractVoiceCapture: vi.fn(),
}));

interface FakeResultEntry {
  transcript: string;
  isFinal: boolean;
}

function makeEvent(entries: FakeResultEntry[], resultIndex = 0) {
  const results: Record<number, unknown> & { length: number } = { length: entries.length };
  entries.forEach((entry, index) => {
    results[index] = { isFinal: entry.isFinal, length: 1, 0: { transcript: entry.transcript } };
  });
  return { resultIndex, results };
}

class FakeSpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  startCalls = 0;
  stopCalls = 0;

  constructor() {
    FakeSpeechRecognition.instances.push(this);
  }

  start() {
    this.startCalls += 1;
  }

  stop() {
    this.stopCalls += 1;
    this.onend?.();
  }
}

function latestRecognition(): FakeSpeechRecognition {
  const instance = FakeSpeechRecognition.instances[FakeSpeechRecognition.instances.length - 1];
  if (!instance) throw new Error("Nenhuma instância de FakeSpeechRecognition foi criada.");
  return instance;
}

const sampleResult: VoiceExtractionResult = {
  amount_cents: { value: 4500, confidence: 0.9 },
  transaction_date: { value: "2026-09-07", confidence: 0.4 },
  type: { value: "saida", confidence: 0.8 },
  description: { value: "mercado", confidence: 0.7 },
  category_suggestion_label: { value: "Alimentação", confidence: 0.6 },
  transcript: "gastei 45 reais no mercado hoje",
  suggestion_disclaimer: "sugestão automática, não confirmada",
};

describe("VoiceRecorderUI — S-CAP-02 / UX-FL-04 (FE-F3-02)", () => {
  const originalSpeechRecognition = (window as typeof window & { SpeechRecognition?: unknown }).SpeechRecognition;

  beforeEach(() => {
    FakeSpeechRecognition.instances = [];
    (window as typeof window & { SpeechRecognition?: unknown }).SpeechRecognition = FakeSpeechRecognition;
    vi.mocked(extractVoiceCapture).mockReset();
  });

  afterEach(() => {
    (window as typeof window & { SpeechRecognition?: unknown }).SpeechRecognition = originalSpeechRecognition;
  });

  it("inicia a gravação ao montar e anuncia 'Ouvindo...' dentro de um contêiner aria-live (AC literal: não só exibido visualmente)", () => {
    render(<VoiceRecorderUI onCancel={vi.fn()} onExtracted={vi.fn()} />);

    expect(latestRecognition().startCalls).toBe(1);

    const liveRegion = screen.getByText("Ouvindo...").closest('[aria-live]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
  });

  it("anuncia a transcrição interina ao vivo dentro do mesmo contêiner aria-live enquanto o usuário fala", () => {
    render(<VoiceRecorderUI onCancel={vi.fn()} onExtracted={vi.fn()} />);

    act(() => {
      latestRecognition().onresult?.(makeEvent([{ transcript: "gastei 45 reais", isFinal: false }]));
    });

    const liveRegion = screen.getByText("Ouvindo...").closest('[aria-live]');
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveTextContent("gastei 45 reais");
  });

  it("'Concluir gravação' para o reconhecimento, chama /voice-capture com a transcrição final e repassa o resultado extraído", async () => {
    vi.mocked(extractVoiceCapture).mockResolvedValue(sampleResult);
    const onExtracted = vi.fn();
    render(<VoiceRecorderUI onCancel={vi.fn()} onExtracted={onExtracted} />);

    act(() => {
      latestRecognition().onresult?.(makeEvent([{ transcript: "gastei 45 reais no mercado hoje", isFinal: true }]));
    });

    await userEvent.click(screen.getByRole("button", { name: "Concluir gravação" }));

    expect(latestRecognition().stopCalls).toBeGreaterThanOrEqual(1);
    expect(extractVoiceCapture).toHaveBeenCalledWith("gastei 45 reais no mercado hoje");
    expect(onExtracted).toHaveBeenCalledWith(sampleResult);
  });

  it("mostra 'Interpretando...' (aria-live) enquanto aguarda /voice-capture", async () => {
    let resolvePromise: (value: VoiceExtractionResult) => void = () => {};
    vi.mocked(extractVoiceCapture).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );
    render(<VoiceRecorderUI onCancel={vi.fn()} onExtracted={vi.fn()} />);

    act(() => {
      latestRecognition().onresult?.(makeEvent([{ transcript: "cinquenta reais", isFinal: true }]));
    });
    await userEvent.click(screen.getByRole("button", { name: "Concluir gravação" }));

    const processing = screen.getByText("Interpretando...");
    expect(processing).toHaveAttribute("aria-live", "polite");

    resolvePromise(sampleResult);
  });

  it("'Cancelar' durante a gravação para o reconhecimento e chama onCancel", async () => {
    const onCancel = vi.fn();
    render(<VoiceRecorderUI onCancel={onCancel} onExtracted={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(latestRecognition().stopCalls).toBeGreaterThanOrEqual(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("erro de reconhecimento (permissão de microfone negada) nunca lança exceção e oferece 'Tentar novamente'/'Cancelar' (nunca beco sem saída)", async () => {
    render(<VoiceRecorderUI onCancel={vi.fn()} onExtracted={vi.fn()} />);

    act(() => {
      latestRecognition().onerror?.({ error: "not-allowed" });
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(/Permissão de microfone negada/);
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("'Tentar novamente' após erro reinicia a gravação (nova instância de reconhecimento, volta a 'Ouvindo...')", async () => {
    render(<VoiceRecorderUI onCancel={vi.fn()} onExtracted={vi.fn()} />);

    act(() => {
      latestRecognition().onerror?.({ error: "no-speech" });
    });
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    const instancesBefore = FakeSpeechRecognition.instances.length;
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(FakeSpeechRecognition.instances.length).toBe(instancesBefore + 1);
    expect(screen.getByText("Ouvindo...")).toBeInTheDocument();
  });

  it("'Concluir gravação' sem nenhuma fala reconhecida mostra erro sem chamar /voice-capture", async () => {
    render(<VoiceRecorderUI onCancel={vi.fn()} onExtracted={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Concluir gravação" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Nenhuma fala foi reconhecida/);
    expect(extractVoiceCapture).not.toHaveBeenCalled();
  });

  it("falha ao chamar /voice-capture mostra erro recuperável (Tentar novamente), sem travar a tela", async () => {
    vi.mocked(extractVoiceCapture).mockRejectedValue(new Error("network down"));
    render(<VoiceRecorderUI onCancel={vi.fn()} onExtracted={vi.fn()} />);

    act(() => {
      latestRecognition().onresult?.(makeEvent([{ transcript: "vinte reais", isFinal: true }]));
    });
    await userEvent.click(screen.getByRole("button", { name: "Concluir gravação" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Não foi possível interpretar a transcrição/);
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("navegador sem suporte à Web Speech API mostra erro imediato sem tentar gravar, com apenas 'Cancelar' disponível", () => {
    delete (window as typeof window & { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as typeof window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    render(<VoiceRecorderUI onCancel={vi.fn()} onExtracted={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/não suporta captura por voz/);
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tentar novamente" })).not.toBeInTheDocument();
  });
});
