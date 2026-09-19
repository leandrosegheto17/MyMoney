import { render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api/errors";

const signInWithPassword = vi.fn();
const sendMagicLink = vi.fn();
const sendPasswordResetEmail = vi.fn();
vi.mock("../../lib/auth/session", () => ({
  signInWithPassword: (...a: unknown[]) => signInWithPassword(...a),
  sendMagicLink: (...a: unknown[]) => sendMagicLink(...a),
  sendPasswordResetEmail: (...a: unknown[]) => sendPasswordResetEmail(...a),
}));

const { LoginPage } = await import("./LoginPage");

beforeEach(() => {
  signInWithPassword.mockReset();
  sendMagicLink.mockReset();
  sendPasswordResetEmail.mockReset();
});

describe("LoginPage — S-AUTH-01 (caracterização, RF-MVP-08)", () => {
  it("estado inicial: título h1, campos e ações", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Entrar no MyMoney" })).toBeInTheDocument();
    expect(screen.getByLabelText(/E-mail/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Senha/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Esqueci minha senha" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("login por senha chama signInWithPassword", async () => {
    signInWithPassword.mockResolvedValue(undefined);
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/E-mail/), "a@b.com");
    await userEvent.type(screen.getByLabelText(/Senha/), "segredo");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledWith("a@b.com", "segredo"));
  });

  it("estado loading enquanto envia", async () => {
    let resolve!: () => void;
    signInWithPassword.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/E-mail/), "a@b.com");
    await userEvent.type(screen.getByLabelText(/Senha/), "x");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("button", { name: /Entrando/ })).toBeInTheDocument();
    resolve();
    await waitFor(() => expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument());
  });

  it("erro ApiError exibe a mensagem em Alert", async () => {
    signInWithPassword.mockRejectedValue(new ApiError({ message: "Credenciais inválidas", kind: "validation", status: 400 }));
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/E-mail/), "a@b.com");
    await userEvent.type(screen.getByLabelText(/Senha/), "x");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Credenciais inválidas")).toBeInTheDocument();
  });

  it("erro genérico usa mensagem padrão", async () => {
    signInWithPassword.mockRejectedValue(new Error("boom"));
    render(<LoginPage />);
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Não foi possível entrar. Tente novamente.")).toBeInTheDocument();
  });

  it("link mágico: oculta senha, envia e mostra sucesso", async () => {
    sendMagicLink.mockResolvedValue(undefined);
    render(<LoginPage />);
    await userEvent.click(screen.getByRole("button", { name: "Prefiro entrar com link mágico" }));
    expect(screen.queryByLabelText(/Senha/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Esqueci minha senha" })).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/E-mail/), "a@b.com");
    await userEvent.click(screen.getByRole("button", { name: "Enviar link mágico" }));
    expect(await screen.findByText(/Link mágico enviado/)).toBeInTheDocument();
    expect(sendMagicLink).toHaveBeenCalledWith("a@b.com");
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("esqueci minha senha sem e-mail mostra erro e não chama", async () => {
    render(<LoginPage />);
    await userEvent.click(screen.getByRole("button", { name: "Esqueci minha senha" }));
    expect(await screen.findByText(/Digite seu e-mail acima/)).toBeInTheDocument();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("esqueci minha senha com e-mail envia redefinição", async () => {
    sendPasswordResetEmail.mockResolvedValue(undefined);
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/E-mail/), "a@b.com");
    await userEvent.click(screen.getByRole("button", { name: "Esqueci minha senha" }));
    expect(await screen.findByText(/Enviamos um e-mail/)).toBeInTheDocument();
    expect(sendPasswordResetEmail).toHaveBeenCalledWith("a@b.com");
  });

  it("não tem violações axe", async () => {
    const { container } = render(<LoginPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
