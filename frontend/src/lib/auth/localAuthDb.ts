import Dexie from "dexie";
import type { Table } from "dexie";

/**
 * Banco local dedicado ao gesto de desbloqueio (PIN) — DIR-17 (`TASK.md` Seção 1.4):
 * "Hash + salt do PIN local nunca é transmitido ou armazenado em texto puro;
 * comparação sempre local ao dispositivo... persistido em IndexedDB local, nunca em
 * tabela de `public`, nunca em `user_metadata` do Supabase Auth". Banco separado do
 * `mymoney-offline` (fila de lançamentos, `lib/offline/db.ts`) — bounded contexts
 * diferentes (autenticação local vs. fila de sincronização), sem motivo para
 * compartilhar schema/versão de upgrade.
 */
export interface LocalPinRecord {
  id: "device-pin";
  salt: string; // base64
  hash: string; // base64 — PBKDF2-SHA256(pin, salt), nunca o PIN em si
  iterations: number;
  createdAt: number;
}

export interface LocalLockoutRecord {
  id: "device-lockout";
  failedAttempts: number;
  /** timestamp (ms) até quando o desbloqueio fica bloqueado; `null` = não bloqueado. */
  lockedUntil: number | null;
}

class LocalAuthDb extends Dexie {
  pin!: Table<LocalPinRecord, string>;
  lockout!: Table<LocalLockoutRecord, string>;

  constructor() {
    super("mymoney-local-auth");
    this.version(1).stores({
      pin: "id",
      lockout: "id",
    });
  }
}

export const localAuthDb = new LocalAuthDb();
