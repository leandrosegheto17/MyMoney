import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { garantirHostLocal } from '../src/ambiente';

const aqui = dirname(fileURLToPath(import.meta.url));
const URL_BANCO =
  process.env.TESTE_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

// Recurso `dados_lancamento` -> casos/dados-lancamento.test.ts
const arquivoDe = (recurso: string) => join(aqui, `${recurso.replaceAll('_', '-')}.test.ts`);

describe('meta: todo recurso do schema api tem caso', () => {
  it('cada view e função de api tem casos/<recurso>.test.ts', async () => {
    garantirHostLocal(URL_BANCO);
    const cliente = new pg.Client({ connectionString: URL_BANCO });
    await cliente.connect();
    let recursos: string[];
    try {
      const { rows } = await cliente.query<{ nome: string }>(`
        select table_name as nome from information_schema.views where table_schema = 'api'
        union
        select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'api'
        order by 1`);
      recursos = rows.map((r) => r.nome);
    } finally {
      await cliente.end();
    }
    expect(recursos.length).toBeGreaterThan(0);
    const semCaso = recursos.filter((r) => !existsSync(arquivoDe(r)));
    expect(semCaso, `recursos de api sem caso: ${semCaso.join(', ')}`).toEqual([]);
  });
});
