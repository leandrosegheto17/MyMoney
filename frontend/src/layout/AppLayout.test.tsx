import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppLayout } from "./AppLayout";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";

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
