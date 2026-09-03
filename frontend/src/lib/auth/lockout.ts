import { localAuthDb } from "./localAuthDb";

/**
 * Bloqueio de tentativas de desbloqueio local — DIR-18/G-17 (`TASK.md`/`GUARDRAILS.md`):
 * "Bloqueio de 5 tentativas malsucedidas / 5 minutos é o baseline; qualquer alteração
 * desse número só pelo DevSecOps na fase tática, não por Backend/Frontend por conta
 * própria." 100% local (DIR-16) — nunca depende de rede.
 */
export const MAX_ATTEMPTS = 5;
export const LOCKOUT_MS = 5 * 60 * 1000;

export interface LockoutStatus {
  locked: boolean;
  remainingAttempts: number;
  lockedUntil: number | null;
}

interface EffectiveState {
  failedAttempts: number;
  lockedUntil: number | null;
}

/** Estado persistido, com a janela de bloqueio já expirada tratada como reinício do contador (não precisa de migração explícita). */
async function readEffectiveState(now: number): Promise<EffectiveState> {
  const state = await localAuthDb.lockout.get("device-lockout");
  if (!state) return { failedAttempts: 0, lockedUntil: null };
  if (state.lockedUntil && state.lockedUntil <= now) {
    return { failedAttempts: 0, lockedUntil: null };
  }
  return { failedAttempts: state.failedAttempts, lockedUntil: state.lockedUntil };
}

function toStatus(state: EffectiveState): LockoutStatus {
  if (state.lockedUntil) {
    return { locked: true, remainingAttempts: 0, lockedUntil: state.lockedUntil };
  }
  return { locked: false, remainingAttempts: Math.max(0, MAX_ATTEMPTS - state.failedAttempts), lockedUntil: null };
}

export async function getLockoutStatus(now: number = Date.now()): Promise<LockoutStatus> {
  return toStatus(await readEffectiveState(now));
}

/** Chamado a cada tentativa de PIN incorreta. Retorna o estado resultante (S-AUTH-05 usa isso para decidir a UI). */
export async function recordFailedAttempt(now: number = Date.now()): Promise<LockoutStatus> {
  const effective = await readEffectiveState(now);
  const failedAttempts = effective.failedAttempts + 1;
  const lockedUntil = failedAttempts >= MAX_ATTEMPTS ? now + LOCKOUT_MS : null;
  await localAuthDb.lockout.put({ id: "device-lockout", failedAttempts, lockedUntil });
  return toStatus({ failedAttempts, lockedUntil });
}

/** Chamado em todo desbloqueio bem-sucedido (PIN correto ou WebAuthn) — zera o contador. */
export async function recordSuccessfulUnlock(): Promise<void> {
  await localAuthDb.lockout.put({ id: "device-lockout", failedAttempts: 0, lockedUntil: null });
}
