// BE-M-10 — Export lógico diário de backup (ADR-009, DIR-31/32, ADR-011 rotação).
// Helpers puros/testáveis, separados de `index.ts` (wiring HTTP) para poder
// rodar `deno test` sem precisar de conexão real ao Postgres nem de
// credenciais reais de storage externo (automated-testing).

// Lista explícita (não introspecção dinâmica) das tabelas de produto — trade-off
// deliberado por simplicidade (coding-guidelines): atualizar aqui quando uma
// nova entidade de Fase 2/3 for criada (BE-F2-01 em diante). `webauthn_challenges`
// fica de fora de propósito — TTL de minutos (efêmera), não é dado de
// recuperação de desastre; `backup_export_log` também fica de fora
// (metadado operacional do próprio job, não dado de produto).
export const BACKUP_TABLES = [
  "profiles",
  "accounts",
  "categories",
  "payment_methods",
  "transactions",
  "budget",
  "webauthn_credentials",
  "email_mfa_challenges",
  "allowed_signup_emails",
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

export interface BackupPayload {
  generated_at: string;
  tables: Record<string, unknown[]>;
}

/** Chave do objeto no bucket, particionada por data (ordenável lexicograficamente). */
export function buildObjectKey(generatedAt: Date): string {
  const iso = generatedAt.toISOString(); // ex.: 2026-09-03T03:00:00.000Z
  const date = iso.slice(0, 10);
  const stamp = iso.replace(/[:.]/g, "-");
  return `mymoney-backups/${date}/export-${stamp}.json.enc`;
}

/** DIR-32: "alerta se o job não rodar por >26h". */
export function isStale(
  lastSuccessAt: Date | null,
  now: Date,
  thresholdHours = 26,
): boolean {
  if (lastSuccessAt === null) return true;
  const diffMs = now.getTime() - lastSuccessAt.getTime();
  return diffMs > thresholdHours * 60 * 60 * 1000;
}

/** Chaves já ordenáveis lexicograficamente por serem prefixadas por data ISO. */
export function sortKeysNewestFirst(keys: string[]): string[] {
  return [...keys].sort().reverse();
}

/** ADR-011 — rotação: mantém só os `keep` mais novos, retorna o excedente a apagar. */
export function objectsToDelete(keysNewestFirst: string[], keep = 30): string[] {
  return keysNewestFirst.slice(keep);
}

// ---- Criptografia AES-256-GCM (Web Crypto, DIR-31 "armazenado criptografado") ----

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Cópia defensiva como `ArrayBuffer` "puro" — necessária porque `Uint8Array.buffer`
 *  é tipado como `ArrayBufferLike` (pode ser `SharedArrayBuffer`), e tanto a Web
 *  Crypto API (`BufferSource`) quanto `fetch`/`Blob` (`BodyInit`/`BlobPart`)
 *  exigem `ArrayBuffer` de verdade. Exportada para reuso em `index.ts`. */
export function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

export async function importAesKey(base64Key: string): Promise<CryptoKey> {
  const raw = base64ToBytes(base64Key);
  if (raw.length !== 32) {
    throw new Error(
      `BACKUP_ENCRYPTION_KEY inválida: esperado 32 bytes (AES-256), obtido ${raw.length}`,
    );
  }
  return await crypto.subtle.importKey("raw", toArrayBuffer(raw), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

/** IV aleatório de 12 bytes por chamada (nunca reaproveitado), prefixado ao ciphertext. */
export async function encryptPayload(
  key: CryptoKey,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(plaintext),
    ),
  );
  const out = new Uint8Array(iv.length + ciphertext.length);
  out.set(iv, 0);
  out.set(ciphertext, iv.length);
  return out;
}

export async function decryptPayload(
  key: CryptoKey,
  encrypted: Uint8Array,
): Promise<Uint8Array> {
  const iv = encrypted.slice(0, 12);
  const ciphertext = encrypted.slice(12);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(ciphertext),
  );
  return new Uint8Array(plaintext);
}

// ---- Autorização do gatilho (pg_cron/pg_net, sem JWT de usuário) ----

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Fail-closed: sem segredo configurado, ou sem header, ou valores diferentes -> nega. */
export function isAuthorizedCronRequest(
  headerValue: string | null,
  expectedSecret: string | null,
): boolean {
  if (!expectedSecret) return false;
  if (!headerValue) return false;
  return timingSafeEqual(headerValue, expectedSecret);
}
