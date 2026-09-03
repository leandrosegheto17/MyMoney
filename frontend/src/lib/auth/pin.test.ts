import { beforeEach, describe, expect, it } from "vitest";
import { localAuthDb } from "./localAuthDb";
import { hasPinConfigured, isValidPinFormat, PIN_LENGTH, setPin, verifyPin } from "./pin";

beforeEach(async () => {
  await localAuthDb.pin.clear();
});

describe("PIN local — DIR-16/17 (100% local, hash+salt, nunca o PIN em claro)", () => {
  it(`isValidPinFormat exige exatamente ${PIN_LENGTH} dígitos numéricos`, () => {
    expect(isValidPinFormat("123456")).toBe(true);
    expect(isValidPinFormat("12345")).toBe(false);
    expect(isValidPinFormat("12a456")).toBe(false);
    expect(isValidPinFormat("")).toBe(false);
  });

  it("hasPinConfigured é false antes do setup e true depois", async () => {
    expect(await hasPinConfigured()).toBe(false);
    await setPin("123456");
    expect(await hasPinConfigured()).toBe(true);
  });

  it("setPin rejeita formato inválido sem persistir nada", async () => {
    await expect(setPin("12")).rejects.toThrow();
    expect(await hasPinConfigured()).toBe(false);
  });

  it("verifyPin retorna true para o PIN correto e false para o incorreto", async () => {
    await setPin("135790");
    expect(await verifyPin("135790")).toBe(true);
    expect(await verifyPin("000000")).toBe(false);
  });

  it("verifyPin retorna false quando nenhum PIN foi configurado ainda, sem lançar", async () => {
    await expect(verifyPin("123456")).resolves.toBe(false);
  });

  it("nunca persiste o PIN em texto puro — hash e salt são armazenados, não o valor digitado", async () => {
    await setPin("246810");
    const record = await localAuthDb.pin.get("device-pin");
    expect(record).toBeDefined();
    expect(record?.hash).not.toContain("246810");
    expect(record?.salt).toBeTruthy();
    expect(record?.hash).toBeTruthy();
  });

  it("dois PINs iguais produzem hashes diferentes (salt aleatório por dispositivo)", async () => {
    await setPin("111222");
    const first = await localAuthDb.pin.get("device-pin");
    await setPin("111222");
    const second = await localAuthDb.pin.get("device-pin");
    expect(first?.salt).not.toEqual(second?.salt);
    expect(first?.hash).not.toEqual(second?.hash);
  });
});
