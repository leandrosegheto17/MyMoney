import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import {
  CONSULTA_FUNCOES,
  CONSULTA_VIEWS,
  compararComCatalogo,
  lerTipos,
  montarCatalogo,
  type CatalogoApi,
  type LinhaFuncao,
  type LinhaView,
} from '../src/aderencia-tipos';
import { garantirHostLocal } from '../src/ambiente';

const aqui = dirname(fileURLToPath(import.meta.url));
const URL_BANCO = process.env.TESTE_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const FONTE = readFileSync(join(aqui, '..', 'src', 'tipos-api.ts'), 'utf8');

async function lerCatalogo(): Promise<CatalogoApi> {
  garantirHostLocal(URL_BANCO);
  const cliente = new pg.Client({ connectionString: URL_BANCO });
  await cliente.connect();
  try {
    const views = await cliente.query<LinhaView>(CONSULTA_VIEWS);
    const funcoes = await cliente.query<LinhaFuncao>(CONSULTA_FUNCOES);
    return montarCatalogo(views.rows, funcoes.rows);
  } finally {
    await cliente.end();
  }
}

describe('meta: tipos-api.ts confere com o schema api do banco', () => {
  it('views, funções, argumentos e colunas sem divergência', async () => {
    const catalogo = await lerCatalogo();
    expect(catalogo.funcoes.length).toBeGreaterThan(0);
    expect(compararComCatalogo(lerTipos(FONTE), catalogo)).toEqual([]);
  });

  it('detecta um argumento e uma coluna renomeados de propósito', async () => {
    const catalogo = await lerCatalogo();
    const argRenomeado = FONTE.replace('p_saldo_real_centavos', 'p_saldo_renomeado');
    const colRenomeada = FONTE.replace('saldo_inicial_centavos: number;', 'saldo_inicial: number;');
    expect(argRenomeado).not.toBe(FONTE);
    expect(colRenomeada).not.toBe(FONTE);
    expect(compararComCatalogo(lerTipos(argRenomeado), catalogo).join('\n')).toMatch(/ajustar_saldo/);
    expect(compararComCatalogo(lerTipos(colRenomeada), catalogo).join('\n')).toMatch(/api\.contas/);
  });
});
