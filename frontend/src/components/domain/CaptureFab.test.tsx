import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CaptureFab } from "./CaptureFab";

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: "/", element: <CaptureFab compact={false} /> },
      { path: "/lancamentos", element: <p>Tela de lançamentos</p> },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

describe("CaptureFab — S-CAP-01 / UX-FL-04 (FE-F3-01)", () => {
  const originalSpeechRecognition = (window as typeof window & { SpeechRecognition?: unknown }).SpeechRecognition;
  const originalWebkitSpeechRecognition = (window as typeof window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

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
      (window as typeof window & { SpeechRecognition?: unknown }).SpeechRecognition = function MockSpeechRecognition() {};
    });

    it("mostra 'Falar' habilitada (sem aria-disabled) junto das outras 2 opções", async () => {
      renderAt("/");
      await userEvent.click(screen.getByRole("button", { name: "Novo lançamento" }));

      const speakOption = await screen.findByRole("menuitem", { name: "Falar" });
      expect(speakOption).toHaveAttribute("aria-disabled", "false");
      expect(speakOption).not.toHaveTextContent("Não disponível neste navegador");
    });

    it("clicar em 'Falar' habilitada fecha o menu sem navegar para rota inexistente (S-CAP-02 fora de escopo)", async () => {
      renderAt("/");
      await userEvent.click(screen.getByRole("button", { name: "Novo lançamento" }));
      await userEvent.click(await screen.findByRole("menuitem", { name: "Falar" }));

      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(screen.queryByText("Tela de lançamentos")).not.toBeInTheDocument();
    });
  });

  it("'Lançamento manual' navega para /lancamentos (RN-20, mesmo destino de sempre)", async () => {
    renderAt("/");
    await userEvent.click(screen.getByRole("button", { name: "Novo lançamento" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Lançamento manual" }));

    expect(await screen.findByText("Tela de lançamentos")).toBeInTheDocument();
  });

  it("'Fotografar' fecha o menu sem navegar para rota inexistente (S-CAP-04 fora de escopo)", async () => {
    renderAt("/");
    await userEvent.click(screen.getByRole("button", { name: "Novo lançamento" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Fotografar" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByText("Tela de lançamentos")).not.toBeInTheDocument();
  });

  it("renderiza como ícone circular compacto quando compact=true, sem rótulo de texto visível", async () => {
    const router = createMemoryRouter([{ path: "/", element: <CaptureFab compact /> }], { initialEntries: ["/"] });
    render(<RouterProvider router={router} />);
    const trigger = screen.getByRole("button", { name: "Novo lançamento" });
    expect(trigger.className).toContain("rounded-full");
    expect(trigger).not.toHaveTextContent("Novo lançamento");
  });
});
