import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Button, Input } from "../../components/base";
import { sendMagicLink, sendPasswordResetEmail, signInWithPassword } from "../../lib/auth/session";
import { ApiError } from "../../lib/api/errors";

type Mode = "password" | "magic-link";

/**
 * S-AUTH-01 — Login (UX-SPEC.md Seção 2.2): "Campo e-mail, campo senha (ou botão
 * 'Enviar link mágico'), botão 'Entrar', link 'Esqueci minha senha'. Sem navegação
 * lateral — tela isolada, pré-sessão."
 */
export function LoginPage() {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);
    try {
      if (mode === "password") {
        await signInWithPassword(email, password);
        // Sessão emitida → `AuthProvider` (`onAuthStateChange`) reage sozinho e avança
        // o estágio para "needs-pin-setup"/"locked"/etc.; nenhuma navegação manual aqui.
      } else {
        await sendMagicLink(email);
        setInfo("Link mágico enviado. Verifique seu e-mail para continuar.");
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Digite seu e-mail acima antes de solicitar a redefinição de senha.");
      return;
    }
    setError(null);
    try {
      await sendPasswordResetEmail(email);
      setInfo("Enviamos um e-mail com instruções para redefinir sua senha.");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Não foi possível enviar o e-mail de redefinição.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt p-4">
      <div className="w-full max-w-sm rounded-lg bg-surface p-6 shadow-elevation-md">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">Entrar no MyMoney</h1>
        <p className="mb-6 text-sm text-neutral-500">Organize suas finanças com segurança.</p>

        {error && (
          <div className="mb-4">
            <Alert variant="danger">{error}</Alert>
          </div>
        )}
        {info && (
          <div className="mb-4">
            <Alert variant="success">{info}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Input label="E-mail" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />

          {mode === "password" && (
            <Input
              label="Senha"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}

          <Button type="submit" loading={isSubmitting} loadingLabel="Entrando">
            {mode === "password" ? "Entrar" : "Enviar link mágico"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "password" ? "magic-link" : "password");
              setError(null);
              setInfo(null);
            }}
            className="min-h-11 text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {mode === "password" ? "Prefiro entrar com link mágico" : "Prefiro entrar com senha"}
          </button>

          {mode === "password" && (
            <button
              type="button"
              onClick={handleForgotPassword}
              className="min-h-11 text-sm text-neutral-500 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
            >
              Esqueci minha senha
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
