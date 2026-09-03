import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PinPad } from "./PinPad";

function ControlledPinPad(props: Partial<React.ComponentProps<typeof PinPad>> = {}) {
  const [value, setValue] = useState("");
  return <PinPad value={value} onChange={setValue} {...props} />;
}

describe("PinPad", () => {
  it("digitar via teclado físico atualiza o valor e dispara onComplete ao atingir o comprimento", async () => {
    const onComplete = vi.fn();
    render(<ControlledPinPad length={6} onComplete={onComplete} />);

    const input = screen.getByLabelText("PIN", { selector: "input" });
    await userEvent.type(input, "123456");

    expect((input as HTMLInputElement).value).toBe("123456");
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("descarta caracteres não numéricos digitados", async () => {
    render(<ControlledPinPad length={4} />);
    const input = screen.getByLabelText("PIN", { selector: "input" }) as HTMLInputElement;
    await userEvent.type(input, "1a2b");
    expect(input.value).toBe("12");
  });

  it("botões de dígito do teclado numérico na tela atualizam o valor (via de toque, alvo >=44px)", async () => {
    render(<ControlledPinPad length={4} />);
    await userEvent.click(screen.getByRole("button", { name: "Dígito 1" }));
    await userEvent.click(screen.getByRole("button", { name: "Dígito 2" }));
    const input = screen.getByLabelText("PIN", { selector: "input" }) as HTMLInputElement;
    expect(input.value).toBe("12");
  });

  it("botão apagar remove o último dígito", async () => {
    render(<ControlledPinPad length={4} />);
    await userEvent.click(screen.getByRole("button", { name: "Dígito 5" }));
    await userEvent.click(screen.getByRole("button", { name: "Dígito 6" }));
    await userEvent.click(screen.getByRole("button", { name: "Apagar último dígito" }));
    const input = screen.getByLabelText("PIN", { selector: "input" }) as HTMLInputElement;
    expect(input.value).toBe("5");
  });

  it("exibe mensagem de erro/tentativas restantes via role=alert", () => {
    render(<PinPad value="" onChange={() => {}} error="PIN incorreto. 3 tentativas restantes." />);
    expect(screen.getByRole("alert")).toHaveTextContent("3 tentativas restantes");
  });

  it("desabilita input e botões durante bloqueio temporário (S-AUTH-05)", () => {
    render(<PinPad value="" onChange={() => {}} disabled />);
    expect(screen.getByLabelText("PIN", { selector: "input" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Dígito 1" })).toBeDisabled();
  });
});
