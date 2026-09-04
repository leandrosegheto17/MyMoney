import { NavLink, Outlet } from "react-router-dom";
import { ToastProvider } from "../components/base/Toast";
import { OfflineSyncBadge } from "../components/domain/OfflineSyncBadge";
import { NotificationBell } from "../components/domain/NotificationBell";
import { DESKTOP_QUERY, useMediaQuery } from "../lib/useMediaQuery";

const MOBILE_DESTINATIONS = [
  { to: "/", label: "Dashboard", icon: "🏠" },
  { to: "/lancamentos", label: "Lançamentos", icon: "📄" },
  { to: "/orcamento", label: "Orçamento", icon: "🎯" },
  { to: "/configuracoes", label: "Mais", icon: "⋯" },
];

const DESKTOP_DESTINATIONS = [
  { to: "/", label: "Dashboard" },
  { to: "/lancamentos", label: "Lançamentos" },
  { to: "/contas", label: "Contas" },
  { to: "/formas-pagamento", label: "Formas de Pagamento" },
  { to: "/categorias", label: "Categorias" },
  { to: "/orcamento", label: "Orçamento" },
  { to: "/cartoes", label: "Cartões" },
  { to: "/parcelamentos", label: "Parcelamentos" },
  { to: "/recorrencias", label: "Recorrências" },
  { to: "/contas-fixas", label: "Contas Fixas" },
  { to: "/metas", label: "Metas" },
  { to: "/relatorios/entradas-saidas", label: "Relatórios" },
  { to: "/configuracoes", label: "Configurações" },
];

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return [
    "flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary",
    isActive ? "bg-blue-50 text-primary" : "text-neutral-600 hover:bg-neutral-100",
  ].join(" ");
}

/**
 * App shell (FE-M-00) + navegação (UX-SPEC.md Seção 6.2): "Mobile (< 1024px): barra
 * de navegação inferior fixa com 5 destinos... Desktop (≥ 1024px): barra lateral fixa
 * com todos os domínios, barra superior com `NotificationBell`, `OfflineSyncBadge` e
 * ação '+ Novo lançamento'." `NotificationBell` (`FE-F2-07`) montado na barra
 * superior, visível em toda tela autenticada (mobile e desktop).
 */
export function AppLayout() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  return (
    <ToastProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo principal
      </a>
      <div className="flex min-h-screen flex-col lg:flex-row">
        {isDesktop && (
          <nav aria-label="Navegação principal" className="flex w-56 shrink-0 flex-col gap-1 border-r border-neutral-200 bg-surface p-4">
            <span className="mb-4 text-lg font-semibold text-primary">MyMoney</span>
            {DESKTOP_DESTINATIONS.map((destination) => (
              <NavLink key={destination.to} to={destination.to} end={destination.to === "/"} className={navLinkClass}>
                {destination.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-neutral-200 bg-surface px-4 py-3">
            {!isDesktop && <span className="text-lg font-semibold text-primary">MyMoney</span>}
            <div className="ml-auto flex items-center gap-3">
              <OfflineSyncBadge />
              <NotificationBell />
              {isDesktop && (
                <NavLink to="/lancamentos" className="min-h-11 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover">
                  + Novo lançamento
                </NavLink>
              )}
            </div>
          </header>

          <main id="main-content" className="flex-1 p-4 pb-24 lg:pb-4">
            <Outlet />
          </main>

          {!isDesktop && (
            <nav
              aria-label="Navegação principal"
              className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-neutral-200 bg-surface pb-[env(safe-area-inset-bottom)]"
            >
              {MOBILE_DESTINATIONS.map((destination) => (
                <NavLink
                  key={destination.to}
                  to={destination.to}
                  end={destination.to === "/"}
                  className={({ isActive }) =>
                    [
                      "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-primary",
                      isActive ? "text-primary" : "text-neutral-500",
                    ].join(" ")
                  }
                >
                  <span aria-hidden="true">{destination.icon}</span>
                  {destination.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
      </div>
    </ToastProvider>
  );
}
