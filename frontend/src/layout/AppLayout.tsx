import { NavLink, Outlet } from "react-router-dom";
import { Home, FileText, Target, MoreHorizontal, Plus } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { ToastProvider } from "../components/base/Toast";
import { OfflineSyncBadge } from "../components/domain/OfflineSyncBadge";
import { NotificationBell } from "../components/domain/NotificationBell";
import { DESKTOP_QUERY, useMediaQuery } from "../lib/useMediaQuery";

// Ícones line-style (biblioteca `lucide-react`, grade 24px) — UX-SPEC.md Seção 3.1,
// token "Ícones": substitui os emoji usados anteriormente na navegação inferior
// mobile (🏠📄🎯⋯), mantendo a mesma semântica por destino.
const MOBILE_DESTINATIONS: Array<{ to: string; label: string; Icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }> }> = [
  { to: "/", label: "Dashboard", Icon: Home },
  { to: "/lancamentos", label: "Lançamentos", Icon: FileText },
  { to: "/orcamento", label: "Orçamento", Icon: Target },
  { to: "/configuracoes", label: "Mais", Icon: MoreHorizontal },
];

/**
 * FE-RS-03 (`UX-SPEC.md` Seção 2.2, "`S-DASH-01` — Redesign visual v2.0", bloco
 * "Desktop (`Main.dc.html`)", item 1): 4 grupos rotulados + 1 grupo final sem
 * rótulo (separado por borda superior). Mesmas 13 rotas já existentes — RN-20:
 * nenhuma rota nova, nenhuma removida, só reagrupadas visualmente.
 */
const DESKTOP_NAV_GROUPS: Array<{ label: string | null; items: Array<{ to: string; label: string }> }> = [
  { label: "Visão geral", items: [{ to: "/", label: "Dashboard" }] },
  {
    label: "Lançamentos",
    items: [
      { to: "/lancamentos", label: "Lançamentos" },
      { to: "/contas", label: "Contas" },
      { to: "/formas-pagamento", label: "Formas de Pagamento" },
      { to: "/categorias", label: "Categorias" },
    ],
  },
  {
    label: "Planejamento",
    items: [
      { to: "/orcamento", label: "Orçamento" },
      { to: "/recorrencias", label: "Recorrências" },
      { to: "/contas-fixas", label: "Contas Fixas" },
      { to: "/metas", label: "Metas" },
    ],
  },
  {
    label: "Cartões",
    items: [
      { to: "/cartoes", label: "Cartões" },
      { to: "/parcelamentos", label: "Parcelamentos" },
    ],
  },
  {
    label: null,
    items: [
      { to: "/relatorios/entradas-saidas", label: "Relatórios" },
      { to: "/configuracoes", label: "Configurações" },
    ],
  },
];

/** Logo "MyMoney" — UX-SPEC.md Seção 3.1 (`Newsreader` itálico) — sempre um `<span>`, nunca um heading, para não colidir com o `<h1>` de cada página (`getByRole("heading")`). */
function Logo({ className = "" }: { className?: string }) {
  return <span className={["font-serif text-xl italic text-primary", className].join(" ")}>MyMoney</span>;
}

/** Botão "+ Novo lançamento" fixo no cabeçalho — UX-SPEC.md Seção 2.2 (nota de navegação): substitui o FAB flutuante em toda tela autenticada. RN-20: mesmo destino (`/lancamentos`) de sempre, só a apresentação muda. Desktop: retangular com rótulo de texto. Mobile: circular, só ícone (nota de navegação: "botão '+' circular no cabeçalho, não na barra inferior"). */
function NewTransactionButton({ compact }: { compact: boolean }): ReactNode {
  if (compact) {
    return (
      <NavLink
        to="/lancamentos"
        aria-label="Novo lançamento"
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Plus size={20} aria-hidden />
      </NavLink>
    );
  }
  return (
    <NavLink
      to="/lancamentos"
      className="flex min-h-11 shrink-0 items-center gap-1 rounded-sm bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-primary"
    >
      <Plus size={16} aria-hidden />
      Novo lançamento
    </NavLink>
  );
}

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return [
    "flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary",
    isActive ? "bg-primary-soft text-primary font-semibold" : "text-neutral-600 hover:bg-neutral-100",
  ].join(" ");
}

/**
 * App shell (FE-M-00) + navegação (UX-SPEC.md Seção 2.2/6.2, Redesign Visual
 * "MyMoney v2.0", FE-RS-03): barra lateral fixa desktop com 4 grupos rotulados +
 * 1 grupo final sem rótulo, logo "MyMoney" em `Newsreader` itálico; barra inferior
 * mobile com exatamente 4 destinos (ícones `lucide-react`, sem emoji); botão
 * "+ Novo lançamento" fixo no cabeçalho de toda tela autenticada, substituindo o
 * FAB flutuante (nenhum FAB existia no código antes desta tarefa — este critério
 * já estava satisfeito, ver nota de decisão no `TASK.md`). `NotificationBell`
 * (`FE-F2-07`) e `OfflineSyncBadge` (RNF-04) seguem visíveis em toda tela
 * autenticada, mobile e desktop. RN-20: nenhuma rota/permissão/comportamento de
 * navegação funcional muda — só a apresentação.
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
          <nav
            aria-label="Navegação principal"
            className="flex w-64 shrink-0 flex-col gap-1 border-r border-neutral-200 bg-surface p-4"
          >
            <Logo className="mb-4 px-3" />
            {DESKTOP_NAV_GROUPS.map((group, groupIndex) => (
              <div
                key={group.label ?? `group-${groupIndex}`}
                className={group.label === null ? "mt-4 flex flex-col gap-1 border-t border-neutral-200 pt-2" : "flex flex-col gap-1"}
              >
                {group.label && (
                  <span className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-600 first:pt-0">
                    {group.label}
                  </span>
                )}
                {group.items.map((destination) => (
                  <NavLink key={destination.to} to={destination.to} end={destination.to === "/"} className={navLinkClass}>
                    {destination.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        )}

        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-surface px-4 py-3">
            {!isDesktop && <Logo />}
            <div className="ml-auto flex min-w-0 items-center gap-3">
              <OfflineSyncBadge />
              <NotificationBell />
              <NewTransactionButton compact={!isDesktop} />
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
                  <destination.Icon size={22} aria-hidden />
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
