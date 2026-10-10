import pg from 'pg';
import { garantirHostLocal } from './ambiente';

const URL_BANCO = process.env.TESTE_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/**
 * Apaga despesas fixas criadas por um caso (com as ocorrências), para não poluir o seed
 * compartilhado: outros casos contam os modelos. A API não tem exclusão de fixa; usa a conexão
 * local do catálogo, só em host local. Idempotente: ids inexistentes são ignorados.
 */
export async function apagarFixas(ids: string[]): Promise<void> {
  garantirHostLocal(URL_BANCO);
  const cliente = new pg.Client({ connectionString: URL_BANCO });
  await cliente.connect();
  try {
    await cliente.query('begin');
    await cliente.query('delete from app.ocorrencia_fixa where despesa_fixa_id = any($1::uuid[])', [ids]);
    await cliente.query('delete from app.despesa_fixa where id = any($1::uuid[])', [ids]);
    await cliente.query('commit');
  } catch (erro) {
    await cliente.query('rollback');
    throw erro;
  } finally {
    await cliente.end();
  }
}

/**
 * Apaga lançamentos criados por um caso (a cascata leva parcelas e dados de pagamento; a
 * ocorrência paga por eles volta a pendente). Mesma conexão local e guarda de `apagarFixas`.
 * Chamar antes de `apagarFixas`. Idempotente: ids inexistentes são ignorados.
 */
export async function apagarLancamentos(ids: string[]): Promise<void> {
  garantirHostLocal(URL_BANCO);
  const cliente = new pg.Client({ connectionString: URL_BANCO });
  await cliente.connect();
  try {
    await cliente.query('delete from app.lancamento where id = any($1::uuid[])', [ids]);
  } finally {
    await cliente.end();
  }
}
