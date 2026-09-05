import { afterEach, describe, expect, it, vi } from "vitest";
import { isPaymentMethodUnificationEnabled } from "./env";

/**
 * `BE-REF-06`/`ADR-016` Decisão 5 (`DIR-39`): a flag `payment_method_unification_enabled`
 * (`VITE_PAYMENT_METHOD_UNIFICATION_ENABLED`) precisa ter default seguro (`false`) — nunca
 * liga sozinha por variável ausente/mal formada. Só fica `true` quando a variável é
 * literalmente a string `"true"`.
 */
describe("isPaymentMethodUnificationEnabled — BE-REF-06/ADR-016 Decisão 5", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("variável ausente => false (default seguro, comportamento hoje em produção)", () => {
    vi.stubEnv("VITE_PAYMENT_METHOD_UNIFICATION_ENABLED", undefined);
    expect(isPaymentMethodUnificationEnabled()).toBe(false);
  });

  it("variável 'false' explícita => false", () => {
    vi.stubEnv("VITE_PAYMENT_METHOD_UNIFICATION_ENABLED", "false");
    expect(isPaymentMethodUnificationEnabled()).toBe(false);
  });

  it("valor mal formado (nem 'true' nem 'false') => false, nunca liga por engano", () => {
    vi.stubEnv("VITE_PAYMENT_METHOD_UNIFICATION_ENABLED", "1");
    expect(isPaymentMethodUnificationEnabled()).toBe(false);
  });

  it("variável 'true' => true (só depois do ato explícito de BE-REF-06)", () => {
    vi.stubEnv("VITE_PAYMENT_METHOD_UNIFICATION_ENABLED", "true");
    expect(isPaymentMethodUnificationEnabled()).toBe(true);
  });
});
