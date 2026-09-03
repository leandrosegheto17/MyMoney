import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmationDialog } from "./ConfirmationDialog";

describe("ConfirmationDialog (Padrão B)", () => {
  it("renders title, one-sentence consequence and two equally-weighted actions", () => {
    render(
      <ConfirmationDialog
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        title="Inativar conta"
        description="Esta conta tem lançamentos vinculados. Ela será inativada, não excluída — o histórico permanece intacto."
      />,
    );
    expect(screen.getByRole("dialog", { name: "Inativar conta" })).toBeInTheDocument();
    expect(screen.getByText(/será inativada, não excluída/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
  });

  it("never pre-focuses the destructive confirm action by default", async () => {
    render(
      <ConfirmationDialog
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        title="Excluir lançamento"
        description="Esta ação não pode ser desfeita."
      />,
    );
    const confirmButton = screen.getByRole("button", { name: "Confirmar" });
    expect(confirmButton).not.toHaveFocus();
  });

  it("calls onConfirm only on explicit confirm action, never implicitly", async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmationDialog
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        title="Excluir lançamento"
        description="Esta ação não pode ser desfeita."
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
