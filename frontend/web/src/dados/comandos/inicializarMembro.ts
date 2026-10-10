import { modoComparacao } from '../modoComparacao';
import { chamarRpc } from './rpc';

/** Uma chamada por usuário e carga do app; falha libera nova tentativa. */
const feitos = new Map<string, Promise<void>>();

/** Cria as categorias iniciais do membro. Nunca lança: a tela não depende do resultado. */
export function inicializarMembro(userId: string): Promise<void> {
  if (modoComparacao() === 'sessao-falsa') return Promise.resolve();
  const existente = feitos.get(userId);
  if (existente) return existente;
  const chamada = chamarRpc('inicializar_membro').then(
    () => undefined,
    () => {
      feitos.delete(userId);
    },
  );
  feitos.set(userId, chamada);
  return chamada;
}
