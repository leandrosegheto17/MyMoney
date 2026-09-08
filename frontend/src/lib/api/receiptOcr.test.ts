import { describe, expect, it, vi } from "vitest";
import { invokeEdgeFunction } from "./edgeFunctions";
import { extractReceiptOcr } from "./receiptOcr";
import type { ReceiptExtractionResult } from "./receiptOcr";

vi.mock("./edgeFunctions", () => ({
  invokeEdgeFunction: vi.fn(),
}));

describe("receiptOcr API client — /receipt-ocr (BE-F3-01), consumido por CaptureFab/DraftReviewBanner (FE-F3-04)", () => {
  it("invoca a edge function 'receipt-ocr' com image_base64/mime_type e retorna result", async () => {
    const result: ReceiptExtractionResult = {
      amount_cents: { value: 4500, confidence: 0.9 },
      merchant_name: { value: "Mercado Bom Preço", confidence: 0.7 },
    };
    vi.mocked(invokeEdgeFunction).mockResolvedValue({ result });

    const response = await extractReceiptOcr({ base64: "ZmFrZQ==", mimeType: "image/jpeg" });

    expect(invokeEdgeFunction).toHaveBeenCalledWith("receipt-ocr", { image_base64: "ZmFrZQ==", mime_type: "image/jpeg" });
    expect(response).toEqual(result);
  });

  it("propaga falha do vendor (502/503) ou de rede sem interceptar — cabe ao chamador decidir (UX-SPEC S-CAP-04: rascunho abre em branco)", async () => {
    vi.mocked(invokeEdgeFunction).mockRejectedValue(new Error("ocr_provider_failed"));

    await expect(extractReceiptOcr({ base64: "ZmFrZQ==", mimeType: "image/jpeg" })).rejects.toThrow("ocr_provider_failed");
  });
});
