import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReceiptCameraCapture } from "./ReceiptCameraCapture";
import * as receiptImage from "../../lib/receiptImage";

vi.mock("../../lib/receiptImage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/receiptImage")>();
  return {
    ...actual,
    // jsdom não implementa canvas 2D (`getContext` retorna `null`), então o
    // recorte real de frame é substituído aqui — o contrato testado é "o que o
    // componente faz com o resultado", não a implementação de canvas em si.
    captureVideoFrame: vi.fn(() => "data:image/jpeg;base64,ZmFrZS1qcGVn"),
  };
});

function makeStream() {
  const stop = vi.fn();
  return { getTracks: () => [{ stop }], __stop: stop } as unknown as MediaStream & { __stop: typeof stop };
}

function makeFile(name: string, type: string, content = "conteudo") {
  return new File([content], name, { type });
}

describe("ReceiptCameraCapture — S-CAP-04 / UX-FL-04 (FE-F3-03)", () => {
  const originalMediaDevices = navigator.mediaDevices;

  afterEach(() => {
    Object.defineProperty(navigator, "mediaDevices", { value: originalMediaDevices, configurable: true });
    vi.restoreAllMocks();
  });

  describe("câmera indisponível no navegador (sem navigator.mediaDevices)", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true });
    });

    it("mostra aviso de câmera indisponível e o upload de arquivo continua visível e funcional (nunca bloqueia)", async () => {
      const onConfirm = vi.fn();
      render(<ReceiptCameraCapture onConfirm={onConfirm} onCancel={vi.fn()} />);

      expect(await screen.findByText(/Câmera indisponível/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Capturar foto/ })).not.toBeInTheDocument();

      const input = screen.getByLabelText("Selecionar arquivo") as HTMLInputElement;
      expect(input).toBeInTheDocument();

      await userEvent.upload(input, makeFile("recibo.jpg", "image/jpeg"));

      expect(await screen.findByAltText("Pré-visualização do recibo capturado")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Usar esta foto" })).toBeInTheDocument();
    });
  });

  describe("permissão de câmera negada (getUserMedia rejeita)", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: { getUserMedia: vi.fn().mockRejectedValue(new DOMException("Permission denied", "NotAllowedError")) },
      });
    });

    it("cai para o upload de arquivo como alternativa, nunca bloqueia o usuário (critério de aceite FE-F3-03)", async () => {
      render(<ReceiptCameraCapture onConfirm={vi.fn()} onCancel={vi.fn()} />);

      expect(await screen.findByText(/Câmera indisponível/)).toBeInTheDocument();
      expect(screen.getByLabelText("Selecionar arquivo")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Capturar foto/ })).not.toBeInTheDocument();
    });

    it("upload de arquivo já estava visível mesmo antes do getUserMedia resolver a negação (nunca escondido atrás do erro)", () => {
      render(<ReceiptCameraCapture onConfirm={vi.fn()} onCancel={vi.fn()} />);
      // Estado inicial ainda é "checking" (promise não resolveu), upload já disponível.
      expect(screen.getByLabelText("Selecionar arquivo")).toBeInTheDocument();
    });
  });

  describe("câmera concedida (getUserMedia resolve)", () => {
    let stream: ReturnType<typeof makeStream>;

    beforeEach(() => {
      stream = makeStream();
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
      });
    });

    it("mostra o viewfinder com moldura-guia, botão 'Capturar foto' e o upload de arquivo lado a lado", async () => {
      render(<ReceiptCameraCapture onConfirm={vi.fn()} onCancel={vi.fn()} />);

      expect(await screen.findByText("Posicione o recibo dentro da moldura")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Capturar foto/ })).toBeInTheDocument();
      expect(screen.getByLabelText("Selecionar arquivo")).toBeInTheDocument();
    });

    it("capturar foto abre a pré-visualização com 'Usar esta foto' / 'Tirar novamente'", async () => {
      render(<ReceiptCameraCapture onConfirm={vi.fn()} onCancel={vi.fn()} />);
      await userEvent.click(await screen.findByRole("button", { name: /Capturar foto/ }));

      expect(await screen.findByAltText("Pré-visualização do recibo capturado")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Usar esta foto" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Tirar novamente" })).toBeInTheDocument();
    });

    it("'Tirar novamente' descarta a pré-visualização e volta ao viewfinder", async () => {
      render(<ReceiptCameraCapture onConfirm={vi.fn()} onCancel={vi.fn()} />);
      await userEvent.click(await screen.findByRole("button", { name: /Capturar foto/ }));
      await userEvent.click(await screen.findByRole("button", { name: "Tirar novamente" }));

      expect(screen.queryByAltText("Pré-visualização do recibo capturado")).not.toBeInTheDocument();
      expect(await screen.findByRole("button", { name: /Capturar foto/ })).toBeInTheDocument();
    });

    it("'Usar esta foto' chama onConfirm com a imagem preparada (base64 sem prefixo + mimeType)", async () => {
      const onConfirm = vi.fn();
      render(<ReceiptCameraCapture onConfirm={onConfirm} onCancel={vi.fn()} />);
      await userEvent.click(await screen.findByRole("button", { name: /Capturar foto/ }));
      await userEvent.click(await screen.findByRole("button", { name: "Usar esta foto" }));

      expect(onConfirm).toHaveBeenCalledWith({ base64: "ZmFrZS1qcGVn", mimeType: "image/jpeg" });
    });

    it("'Usar esta foto' com imagem inválida (mock de validatePreparedImage) mostra erro e permanece na pré-visualização", async () => {
      const validateSpy = vi
        .spyOn(receiptImage, "validatePreparedImage")
        .mockReturnValue({ ok: false, message: "Imagem muito grande (máx. 8MB)." });

      render(<ReceiptCameraCapture onConfirm={vi.fn()} onCancel={vi.fn()} />);
      await userEvent.click(await screen.findByRole("button", { name: /Capturar foto/ }));
      await userEvent.click(await screen.findByRole("button", { name: "Usar esta foto" }));

      expect(await screen.findByText("Imagem muito grande (máx. 8MB).")).toBeInTheDocument();
      expect(screen.getByAltText("Pré-visualização do recibo capturado")).toBeInTheDocument();
      validateSpy.mockRestore();
    });

    it("Cancelar chama onCancel e para as tracks do stream de câmera", async () => {
      const onCancel = vi.fn();
      render(<ReceiptCameraCapture onConfirm={vi.fn()} onCancel={onCancel} />);
      await screen.findByRole("button", { name: /Capturar foto/ });

      await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(onCancel).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(stream.__stop).toHaveBeenCalled());
    });

    it("selecionar um arquivo enquanto a câmera está disponível também funciona (upload nunca é uma opção 'secundária')", async () => {
      render(<ReceiptCameraCapture onConfirm={vi.fn()} onCancel={vi.fn()} />);
      await screen.findByRole("button", { name: /Capturar foto/ });

      const input = screen.getByLabelText("Selecionar arquivo") as HTMLInputElement;
      await userEvent.upload(input, makeFile("recibo.png", "image/png"));

      expect(await screen.findByAltText("Pré-visualização do recibo capturado")).toBeInTheDocument();
    });
  });
});
