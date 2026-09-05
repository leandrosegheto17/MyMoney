import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppLayout } from "./AppLayout";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { DESKTOP_QUERY } from "../lib/useMediaQuery";

/** Simula o breakpoint desktop (`DESKTOP_QUERY`, `useMediaQuery`) — mesma técnica já usada pelo restante da suíte para componentes responsivos (Modal/BottomSheet). */
function stubDesktopViewport(isDesktop: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: isDesktop && query === DESKTOP_QUERY,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <AppLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

describe("App shell routing (FE-M-00)", () => {
  it("renders the home route inside the shell (header + skip link)", async () => {
    renderAt("/");
    expect(screen.getByRole("link", { name: "Pular para o conteúdo principal" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "MyMoney" })).toBeInTheDocument();
    expect(screen.getAllByText("MyMoney")).toHaveLength(2);
  });

  it("renders the not-found page for an unknown route", async () => {
    renderAt("/rota-que-nao-existe");
    expect(await screen.findByText("Página não encontrada")).toBeInTheDocument();
  });

  it("always shows the OfflineSyncBadge region at the top of the shell (RNF-04)", async () => {
    renderAt("/");
    expect(await screen.findByText("Tudo sincronizado")).toBeInTheDocument();
  });
});

describe("Navegação v2.0 (FE-RS-03, UX-SPEC.md Seção 2.2 nota de navegação)", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe("desktop (>= 1024px)", () => {
    beforeEach(() => stubDesktopViewport(true));

    it("renders the sidebar with the 4 labeled groups plus 1 unlabeled trailing group, preserving all 13 existing routes (RN-20)", async () => {
      renderAt("/");
      const sidebar = await screen.findByRole("navigation", { name: "Navegação principal" });

      for (const label of ["Visão geral", "Lançamentos", "Planejamento", "Cartões"]) {
        expect(within(sidebar).getByText(label, { selector: "span" })).toBeInTheDocument();
      }

      const routes = [
        "Dashboard",
        "Lançamentos",
        "Contas",
        "Formas de Pagamento",
        "Categorias",
        "Orçamento",
        "Recorrências",
        "Contas Fixas",
        "Metas",
        "Cartões",
        "Parcelamentos",
        "Relatórios",
        "Configurações",
      ];
      for (const routeLabel of routes) {
        expect(within(sidebar).getByRole("link", { name: routeLabel })).toBeInTheDocument();
      }
    });

    it("highlights the active item with the accent-soft/accent tokens and semibold weight", async () => {
      renderAt("/");
      const sidebar = await screen.findByRole("navigation", { name: "Navegação principal" });
      const activeLink = within(sidebar).getByRole("link", { name: "Dashboard" });
      expect(activeLink).toHaveAttribute("aria-current", "page");
      expect(activeLink.className).toContain("bg-primary-soft");
      expect(activeLink.className).toContain("text-primary");
      expect(activeLink.className).toContain("font-semibold");
    });

    it("renders the 'MyMoney' logo in the sidebar with the Newsreader italic typographic contract", async () => {
      renderAt("/");
      const sidebar = await screen.findByRole("navigation", { name: "Navegação principal" });
      const logo = within(sidebar).getByText("MyMoney");
      expect(logo.className).toContain("font-serif");
      expect(logo.className).toContain("italic");
    });

    it("shows the full-label '+ Novo lançamento' header button, pointing to the same /lancamentos route as before (RN-20)", async () => {
      renderAt("/");
      const button = await screen.findByRole("link", { name: /Novo lançamento/ });
      expect(button).toHaveAttribute("href", "/lancamentos");
    });

    it("does not render the mobile bottom navigation on desktop", async () => {
      renderAt("/");
      await screen.findByRole("heading", { name: "MyMoney" });
      expect(screen.queryByRole("link", { name: "Mais" })).not.toBeInTheDocument();
    });

    it("preserves keyboard navigation and visible focus across the new sidebar structure (WCAG, UX-SPEC.md Seção 5)", async () => {
      renderAt("/");
      const sidebar = await screen.findByRole("navigation", { name: "Navegação principal" });
      const firstLink = within(sidebar).getByRole("link", { name: "Dashboard" });
      firstLink.focus();
      expect(firstLink).toHaveFocus();
      await userEvent.tab();
      expect(within(sidebar).getByRole("link", { name: "Lançamentos" })).toHaveFocus();
    });
  });

  describe("mobile (< 1024px)", () => {
    beforeEach(() => stubDesktopViewport(false));

    it("renders exactly 4 bottom-nav destinations (Dashboard, Lançamentos, Orçamento, Mais), no emoji, using lucide-react icons", async () => {
      renderAt("/");
      const bottomNav = (await screen.findAllByRole("navigation", { name: "Navegação principal" })).at(-1)!;
      const links = within(bottomNav).getAllByRole("link");
      expect(links).toHaveLength(4);
      expect(links.map((link) => link.textContent)).toEqual(["Dashboard", "Lançamentos", "Orçamento", "Mais"]);
      // Nenhum destino usa emoji — cada link contém um <svg> (ícone `lucide-react`), não um glifo de texto.
      for (const link of links) {
        expect(link.querySelector("svg")).toBeInTheDocument();
      }
    });

    it("shows a compact circular '+ Novo lançamento' icon button in the header, not in the bottom bar (nota de navegação)", async () => {
      renderAt("/");
      const button = await screen.findByRole("link", { name: "Novo lançamento" });
      expect(button).toHaveAttribute("href", "/lancamentos");
      expect(button.className).toContain("rounded-full");

      const bottomNav = (await screen.findAllByRole("navigation", { name: "Navegação principal" })).at(-1)!;
      expect(within(bottomNav).queryByRole("link", { name: "Novo lançamento" })).not.toBeInTheDocument();
    });

    it("does not render a floating FAB anywhere in the shell", async () => {
      renderAt("/");
      await screen.findByRole("heading", { name: "MyMoney" });
      expect(document.querySelector('[class*="fixed"][class*="bottom"][class*="rounded-full"]')).not.toBeInTheDocument();
    });
  });
});
