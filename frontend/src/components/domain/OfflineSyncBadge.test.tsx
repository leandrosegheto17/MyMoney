import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { offlineDb } from "../../lib/offline/db";
import { enqueueTransaction } from "../../lib/offline/queue";
import { OfflineSyncBadge } from "./OfflineSyncBadge";

const DRAFT = {
  accountId: "acc-1",
  paymentMethodId: "pm-1",
  categoryId: "cat-1",
  subcategoryId: null,
  amountCents: 4500,
  type: "saida" as const,
  description: "Mercado",
  date: "2026-09-02",
};

beforeEach(async () => {
  await offlineDb.pendingTransactions.clear();
});

describe("OfflineSyncBadge", () => {
  it("shows a neutral 'tudo sincronizado' state when the queue is empty", async () => {
    render(<OfflineSyncBadge />);
    expect(await screen.findByText("Tudo sincronizado")).toBeInTheDocument();
  });

  it("shows the pending count when there are queued items", async () => {
    await enqueueTransaction(DRAFT);
    await enqueueTransaction(DRAFT);
    render(<OfflineSyncBadge />);
    expect(await screen.findByText(/2 lançamentos/)).toBeInTheDocument();
  });

  it("uses the design-system warn-soft token for the pending badge, never the raw Tailwind ramp (FE-RS-14, UX-03 Achado 1)", async () => {
    await enqueueTransaction(DRAFT);
    render(<OfflineSyncBadge />);

    const badge = await screen.findByRole("button", { name: /lançamento/ });
    expect(badge.className).toContain("bg-warning-soft");
    expect(badge.className).not.toMatch(/bg-amber-\d{2,3}/);
    expect(badge.className).not.toMatch(/hover:bg-amber-\d{2,3}/);
  });

  it("reveals the detail of pending items when tapped", async () => {
    await enqueueTransaction(DRAFT);
    render(<OfflineSyncBadge />);

    const badge = await screen.findByRole("button", { name: /lançamento/ });
    await userEvent.click(badge);

    expect(screen.getByRole("dialog", { name: "Lançamentos aguardando sincronização" })).toBeInTheDocument();
    expect(screen.getByText("Mercado")).toBeInTheDocument();
  });

  it("syncs successfully via an injected client and clears the queue without losing data first", async () => {
    await enqueueTransaction(DRAFT);
    render(<OfflineSyncBadge syncClient={async () => ({ ok: true })} />);

    const badge = await screen.findByRole("button", { name: /lançamento/ });
    await userEvent.click(badge);
    await userEvent.click(screen.getByRole("button", { name: "Tentar sincronizar agora" }));

    await waitFor(async () => expect(await offlineDb.pendingTransactions.count()).toBe(0));
  });
});
