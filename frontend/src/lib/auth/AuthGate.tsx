import { Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { LoginPage } from "../../pages/auth/LoginPage";
import { PinSetupPage } from "../../pages/auth/PinSetupPage";
import { UnlockPage } from "../../pages/auth/UnlockPage";

/**
 * Gate de roteamento (UX-FL-10) — decide qual tela mostrar conforme o estágio de
 * `useAuth()`, sem exigir que cada rota individual reimplemente essa checagem.
 * Só renderiza `<Outlet />` (o app autenticado de fato) quando `stage === "unlocked"`.
 * Fluxo: Login → Senha → PIN (sem 2º fator por e-mail, ADR-014).
 */
export function AuthGate() {
  const { stage } = useAuth();

  switch (stage) {
    case "loading":
      return (
        <div role="status" aria-label="Carregando" className="flex min-h-screen items-center justify-center text-neutral-400">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
        </div>
      );
    case "signed-out":
      return <LoginPage />;
    case "needs-pin-setup":
      return <PinSetupPage />;
    case "locked":
      return <UnlockPage />;
    case "unlocked":
      return <Outlet />;
  }
}
