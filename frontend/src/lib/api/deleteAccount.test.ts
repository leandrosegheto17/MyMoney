import { describe, expect, it, vi } from "vitest";
import { invokeEdgeFunction } from "./edgeFunctions";
import { deleteAccount } from "./deleteAccount";
import type { DeleteAccountResult } from "./deleteAccount";

vi.mock("./edgeFunctions", () => ({
  invokeEdgeFunction: vi.fn(),
}));

describe("deleteAccount API client — /delete-account (BE-F3-09, ADR-011), consumido por SettingsPage (FE-F3-09)", () => {
  it("invoca a edge function 'delete-account' com corpo vazio (alvo sempre o próprio usuário autenticado) e retorna o resultado", async () => {
    const result: DeleteAccountResult = {
      ok: true,
      deleted_rows: { accounts: 2, transactions: 40 },
      storage_removed_count: 1,
      storage_warning: null,
    };
    vi.mocked(invokeEdgeFunction).mockResolvedValue(result);

    const response = await deleteAccount();

    expect(invokeEdgeFunction).toHaveBeenCalledWith("delete-account", {});
    expect(response).toEqual(result);
  });

  it("propaga falha (500/502/rede) sem interceptar — cabe ao chamador (SettingsPage) decidir se desloga ou não", async () => {
    vi.mocked(invokeEdgeFunction).mockRejectedValue(new Error("account_data_deletion_failed"));

    await expect(deleteAccount()).rejects.toThrow("account_data_deletion_failed");
  });
});
