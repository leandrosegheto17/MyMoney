import { describe, expect, it } from "vitest";
import { centsToDecimal, decimalToCents, digitsOnly, digitsToCents, formatCentsToBRL } from "./currency";

describe("currency utils", () => {
  it("formats cents as BRL currency with the R$ symbol always present (RNF-07)", () => {
    expect(formatCentsToBRL(123456)).toBe(`R$ 1.234,56`);
    expect(formatCentsToBRL(0)).toBe(`R$ 0,00`);
  });

  it("strips non-digit characters", () => {
    expect(digitsOnly("R$ 1.234,56")).toBe("123456");
  });

  it("converts raw digits to cents", () => {
    expect(digitsToCents("123456")).toBe(123456);
    expect(digitsToCents("")).toBe(0);
  });

  it("round-trips decimal <-> cents used by the API contract", () => {
    expect(decimalToCents(1234.56)).toBe(123456);
    expect(centsToDecimal(123456)).toBe(1234.56);
  });
});
