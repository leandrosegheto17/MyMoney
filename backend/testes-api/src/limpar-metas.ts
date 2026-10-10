import pg from 'pg';
import { garantirHostLocal } from './ambiente';

const URL_BANCO = process.env.TESTE_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/**
 * Apaga metas criadas por um caso (com movimentos e movimentos de conta), para não poluir o seed
 * compartilhado. A API não tem exclusão de meta; usa a conexão local do catálogo (mesma do
 * `_meta.test.ts`), só em host local. Idempotente: serve também antes do caso, após execução abortada.
 */
export async function apagarMetas(ids: string[]): Promise<void> {
  garantirHostLocal(URL_BANCO);
  const cliente = new pg.Client({ connectionString: URL_BANCO });
  await cliente.connect();
  try {
    await cliente.query('begin');
    await cliente.query(
      `delete from app.movimento_conta
        where movimento_meta_id in (select id from app.movimento_meta where meta_id = any($1::uuid[]))`,
      [ids],
    );
    await cliente.query('delete from app.movimento_meta where meta_id = any($1::uuid[])', [ids]);
    await cliente.query('delete from app.meta where id = any($1::uuid[])', [ids]);
    await cliente.query('commit');
  } catch (erro) {
    await cliente.query('rollback');
    throw erro;
  } finally {
    await cliente.end();
  }
}
