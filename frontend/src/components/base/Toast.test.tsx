import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ToastProvider, useToast } from "./Toast";
import { Button } from "./Button";

function Trigger() {
  const { showToast } = useToast();
  return <Button onClick={() => showToast("Salvo com sucesso")}>Salvar</Button>;
}

describe("Toast/Snackbar", () => {
  it("shows a toast in a polite live region after showToast is called", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Salvo com sucesso");
  });

  it("can be dismissed explicitly by the user", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await screen.findByRole("status");
    await userEvent.click(screen.getByRole("button", { name: "Dispensar notificação" }));
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  it("throws a clear error when useToast is used outside the provider", () => {
    function Broken() {
      useToast();
      return null;
    }
    expect(() => render(<Broken />)).toThrow(/ToastProvider/);
  });
});
