import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

function ModalHarness() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Abrir</Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Nova conta">
        <input aria-label="Nome" />
        <button type="button">Salvar</button>
      </Modal>
    </div>
  );
}

describe("Modal/BottomSheet", () => {
  it("is not rendered when closed", () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Título">
        <p>corpo</p>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders as an accessible dialog labelled by the title when open", () => {
    render(
      <Modal isOpen onClose={() => {}} title="Nova conta">
        <p>corpo</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Nova conta" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("moves focus to the first interactive element on open and returns focus to the trigger on close", async () => {
    render(<ModalHarness />);
    const trigger = screen.getByRole("button", { name: "Abrir" });
    await userEvent.click(trigger);

    // Primeiro elemento interativo em ordem de DOM dentro do diálogo (UX-SPEC Seção 5).
    const closeButton = screen.getByRole("button", { name: "Fechar" });
    expect(closeButton).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("traps Tab navigation within the dialog", async () => {
    render(<ModalHarness />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));

    const closeButton = screen.getByRole("button", { name: "Fechar" });
    const nameInput = screen.getByLabelText("Nome");
    const saveButton = screen.getByRole("button", { name: "Salvar" });

    expect(closeButton).toHaveFocus();
    await userEvent.tab();
    expect(nameInput).toHaveFocus();
    await userEvent.tab();
    expect(saveButton).toHaveFocus();
    await userEvent.tab();
    expect(closeButton).toHaveFocus();
  });

  it("closes when clicking the backdrop", async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Nova conta">
        <p>corpo</p>
      </Modal>,
    );
    const backdrop = document.querySelector('[aria-hidden="true"]')!;
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
