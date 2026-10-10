import { clear, createStore, get, set } from 'idb-keyval';
import type { DadosLancamento } from '@mymoney/contrato/respostas/dados-lancamento';

/** Banco próprio: a fila de envio mora em outro banco e nunca é tocada por este cache. */
const armazem = createStore('mymoney-cache', 'dados');
const CHAVE = 'dados_lancamento';

export type CacheDadosLancamento = { dados: DadosLancamento; salvoEm: number };

type Registro = CacheDadosLancamento & { usuarioId: string };

export async function salvarCache(usuarioId: string, dados: DadosLancamento): Promise<void> {
  const registro: Registro = { usuarioId, dados, salvoEm: Date.now() };
  await set(CHAVE, registro, armazem);
}

/** Só devolve se o cache for do mesmo usuário: outro membro no aparelho nunca vê o do primeiro. */
export async function lerCache(usuarioId: string): Promise<CacheDadosLancamento | undefined> {
  const registro = await get<Registro>(CHAVE, armazem);
  if (registro?.usuarioId !== usuarioId) return undefined;
  return { dados: registro.dados, salvoEm: registro.salvoEm };
}

/** Sem IndexedDB no ambiente não há o que apagar. */
export async function apagarCache(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  await clear(armazem);
}
