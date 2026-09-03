import { beforeEach, describe, expect, it } from "vitest";
import { localAuthDb } from "./localAuthDb";
import { getLockoutStatus, LOCKOUT_MS, MAX_ATTEMPTS, recordFailedAttempt, recordSuccessfulUnlock } from "./lockout";

beforeEach(async () => {
  await localAuthDb.lockout.clear();
});

describe("lockout local — DIR-18/G-17 (5 tentativas / 5 minutos, baseline)", () => {
  it("começa destravado com todas as tentativas disponíveis", async () => {
    const status = await getLockoutStatus();
    expect(status).toEqual({ locked: false, remainingAttempts: MAX_ATTEMPTS, lockedUntil: null });
  });

  it("decrementa tentativas restantes a cada falha, sem travar antes do limite", async () => {
    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      const status = await recordFailedAttempt();
      expect(status.locked).toBe(false);
      expect(status.remainingAttempts).toBe(MAX_ATTEMPTS - i);
    }
  });

  it(`trava após a ${MAX_ATTEMPTS}ª tentativa incorreta, com lockedUntil ${LOCKOUT_MS}ms à frente`, async () => {
    const now = 1_000_000;
    let status = { locked: false, remainingAttempts: MAX_ATTEMPTS, lockedUntil: null as number | null };
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      status = await recordFailedAttempt(now);
    }
    expect(status.locked).toBe(true);
    expect(status.remainingAttempts).toBe(0);
    expect(status.lockedUntil).toBe(now + LOCKOUT_MS);
  });

  it("getLockoutStatus reporta locked=true enquanto dentro da janela de bloqueio", async () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await recordFailedAttempt(now);
    }
    const stillLocked = await getLockoutStatus(now + LOCKOUT_MS - 1);
    expect(stillLocked.locked).toBe(true);
  });

  it("libera automaticamente depois que a janela de bloqueio expira, resetando o contador", async () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await recordFailedAttempt(now);
    }
    const afterWindow = await getLockoutStatus(now + LOCKOUT_MS + 1);
    expect(afterWindow).toEqual({ locked: false, remainingAttempts: MAX_ATTEMPTS, lockedUntil: null });
  });

  it("recordSuccessfulUnlock zera o contador de tentativas falhas", async () => {
    await recordFailedAttempt();
    await recordFailedAttempt();
    await recordSuccessfulUnlock();
    const status = await getLockoutStatus();
    expect(status).toEqual({ locked: false, remainingAttempts: MAX_ATTEMPTS, lockedUntil: null });
  });
});
