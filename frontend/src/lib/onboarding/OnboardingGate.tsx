import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { listAccounts } from "../api/accounts";
import { Skeleton } from "../../components/base";

/**
 * UX-FL-11 (Onboarding) — "Sem conta cadastrada, usuário não avança (RF-MVP-01 é
 * pré-requisito estrutural)". Roda depois do `AuthGate` (exige sessão + MFA + desbloqueio
 * já concluídos — sem isso, `listAccounts()` nem teria JWT válido para chamar).
 */
export function OnboardingGate() {
  const [state, setState] = useState<"loading" | "needs-onboarding" | "ready">("loading");

  useEffect(() => {
    let active = true;
    listAccounts()
      .then((accounts) => {
        if (active) setState(accounts.length > 0 ? "ready" : "needs-onboarding");
      })
      .catch((error) => {
        // Falha ao checar (ex. rede instável momentânea) não deve prender o usuário
        // numa tela de loading infinita — segue para o app, que já trata erro de
        // carregamento por tela (Padrão A, UX-SPEC Seção 4.1).
        console.error("OnboardingGate: falha ao checar contas existentes", error);
        if (active) setState("ready");
      });
    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Skeleton lines={3} className="w-full max-w-sm" aria-label="Verificando cadastro inicial" />
      </div>
    );
  }
  if (state === "needs-onboarding") {
    return <Navigate to="/onboarding/conta" replace />;
  }
  return <Outlet />;
}
