import { describe, expect, it } from "vitest";
import { derivePaymentMethodLabel } from "./derivePaymentMethodLabel";
import type { Account, PaymentMethod } from "../api/types";

function account(overrides: Partial<Account> = {}): Account {
  return {
    id: "acc-1",
    user_id: "u1",
    name: "Conta Corrente",
    type: "checking",
    currency: "BRL",
    initial_balance_cents: 0,
    current_balance_cents: 0,
    color: null,
    icon: null,
    is_active: true,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

function paymentMethod(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    id: "pm-1",
    user_id: "u1",
    account_id: "acc-1",
    credit_card_id: null,
    type: "pix",
    name: "Pix",
    is_active: true,
    is_system_default: true,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

describe("derivePaymentMethodLabel — RN-14 (ADR-016 Decisão 1, DIR-37)", () => {
  it("com só 1 conta ativa: rótulo simples, sem sufixo de conta", () => {
    const accounts = [account({ id: "acc-1", name: "Conta Corrente" })];
    expect(derivePaymentMethodLabel(paymentMethod({ account_id: "acc-1" }), accounts)).toBe("Pix");
  });

  it("com mais de 1 conta ativa: sufixo '{Forma} {Conta}'", () => {
    const accounts = [
      account({ id: "acc-1", name: "Conta Corrente" }),
      account({ id: "acc-2", name: "Nubank" }),
    ];
    expect(derivePaymentMethodLabel(paymentMethod({ account_id: "acc-1", name: "Débito" }), accounts)).toBe("Débito Conta Corrente");
    expect(derivePaymentMethodLabel(paymentMethod({ account_id: "acc-2", name: "Débito" }), accounts)).toBe("Débito Nubank");
  });

  it("com mais de 1 conta cadastrada mas só 1 ATIVA: rótulo simples (conta ativa, não conta total, é o critério de RN-14)", () => {
    const accounts = [
      account({ id: "acc-1", name: "Conta Corrente", is_active: true }),
      account({ id: "acc-2", name: "Conta Antiga", is_active: false }),
    ];
    expect(derivePaymentMethodLabel(paymentMethod({ account_id: "acc-1" }), accounts)).toBe("Pix");
  });

  it("forma vinculada a cartão de crédito: mantém o nome do cartão, nunca ganha sufixo (RN-14 exceção 1 / AC5)", () => {
    const accounts = [
      account({ id: "acc-1", name: "Conta Corrente" }),
      account({ id: "acc-2", name: "Nubank" }),
    ];
    const cardPaymentMethod = paymentMethod({ type: "credit_card", name: "Cartão Nubank", account_id: null, credit_card_id: "card-1" });
    expect(derivePaymentMethodLabel(cardPaymentMethod, accounts)).toBe("Cartão Nubank");
  });

  it("forma sem account_id (defensivo, mesmo caso de cartão): mantém o nome, sem sufixo", () => {
    const accounts = [account({ id: "acc-1" }), account({ id: "acc-2", name: "Nubank" })];
    expect(derivePaymentMethodLabel(paymentMethod({ account_id: null }), accounts)).toBe("Pix");
  });

  it("account_id referencia uma conta que não está na lista carregada (defensivo): mantém o nome, sem quebrar", () => {
    const accounts = [account({ id: "acc-1" }), account({ id: "acc-2", name: "Nubank" })];
    expect(derivePaymentMethodLabel(paymentMethod({ account_id: "acc-inexistente" }), accounts)).toBe("Pix");
  });
});
