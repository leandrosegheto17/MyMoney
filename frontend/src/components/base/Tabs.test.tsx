import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tabs } from "./Tabs";

const TABS = [
  { id: "mes-atual", label: "Setembro", content: <p>Fatura de setembro</p> },
  { id: "mes-1", label: "Outubro", content: <p>Fatura de outubro</p> },
  { id: "mes-2", label: "Novembro", content: <p>Fatura de novembro</p> },
];

describe("Tabs", () => {
  it("shows the content of the active tab and hides the others", () => {
    const { container } = render(<Tabs tabs={TABS} label="Competências da fatura" />);
    expect(screen.getByText("Fatura de setembro")).toBeVisible();
    expect(screen.queryByText("Fatura de outubro")).not.toBeInTheDocument();
    const inactivePanel = container.querySelector('[role="tabpanel"][hidden]');
    expect(inactivePanel).not.toBeNull();
  });

  it("switches tab on click", async () => {
    render(<Tabs tabs={TABS} label="Competências da fatura" />);
    await userEvent.click(screen.getByRole("tab", { name: "Outubro" }));
    expect(screen.getByRole("tab", { name: "Outubro" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Fatura de outubro")).toBeVisible();
  });

  it("navigates between tabs with ArrowRight and moves focus (roving tabindex)", async () => {
    render(<Tabs tabs={TABS} label="Competências da fatura" />);
    const first = screen.getByRole("tab", { name: "Setembro" });
    first.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Outubro" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Outubro" })).toHaveAttribute("aria-selected", "true");
  });
});
