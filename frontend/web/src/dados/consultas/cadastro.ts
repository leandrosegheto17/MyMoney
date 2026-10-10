import { obterCliente } from '../cliente';
import { extrair, type ErroDados } from '../erros';

export type TabelaCadastro = 'contas' | 'formas_pagamento' | 'categorias';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "Não existe" e "não é seu" dão a mesma resposta: a tela não distingue. */
const REGISTRO_INVALIDO: ErroDados = { tipo: 'regra', codigo: 'registro_invalido' };

/** O supabase-js repetiria GET em 503 com espera de segundos; quem decide tentar de novo é o cache de consulta. */
const consultar = (tabela: TabelaCadastro) => obterCliente().from(tabela).select('*').retry(false);

/** Todas as linhas da view, inclusive arquivadas: quem mostra decide o filtro. */
export async function buscarLinhas<T>(tabela: TabelaCadastro): Promise<T[]> {
  return extrair<T[]>(await consultar(tabela));
}

export async function buscarLinha<T>(tabela: TabelaCadastro, id: string): Promise<T> {
  if (!UUID.test(id)) throw REGISTRO_INVALIDO;
  const linhas = extrair<T[]>(await consultar(tabela).eq('id', id));
  const [linha] = linhas;
  if (linha === undefined) throw REGISTRO_INVALIDO;
  return linha;
}
