import { localAuthDb } from "./localAuthDb";

/** S-AUTH-04: PIN numérico de 6 dígitos, mesmo comprimento do código de e-mail MFA (consistência de produto). */
export const PIN_LENGTH = 6;
const PBKDF2_ITERATIONS = 100_000;

function toBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function derivePinHash(pin: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    256,
  );
}

export function isValidPinFormat(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export async function hasPinConfigured(): Promise<boolean> {
  return (await localAuthDb.pin.get("device-pin")) !== undefined;
}

/**
 * DIR-17: hash + salt calculados e persistidos 100% localmente (`crypto.subtle`,
 * IndexedDB) — o PIN em si nunca sai deste função, nunca é transmitido ao servidor.
 */
export async function setPin(pin: string): Promise<void> {
  if (!isValidPinFormat(pin)) {
    throw new Error(`PIN deve ter exatamente ${PIN_LENGTH} dígitos numéricos.`);
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hashBits = await derivePinHash(pin, salt, PBKDF2_ITERATIONS);
  await localAuthDb.pin.put({
    id: "device-pin",
    salt: toBase64(salt.buffer as ArrayBuffer),
    hash: toBase64(hashBits),
    iterations: PBKDF2_ITERATIONS,
    createdAt: Date.now(),
  });
}

/** Comparação 100% local (DIR-16: funciona offline) — nunca faz chamada de rede. */
export async function verifyPin(pin: string): Promise<boolean> {
  const record = await localAuthDb.pin.get("device-pin");
  if (!record) return false;
  const salt = fromBase64(record.salt);
  const computed = await derivePinHash(pin, salt, record.iterations);
  return toBase64(computed) === record.hash;
}

/** Usado ao trocar o PIN (S-SET-01, "Alterar PIN") ou no logout, se o produto decidir exigir novo setup por dispositivo. */
export async function clearLocalPin(): Promise<void> {
  await localAuthDb.pin.delete("device-pin");
}
