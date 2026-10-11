import { escreverMesNaUrl } from '../formatacao/mes';
import type { NomeIcone } from './base/Icone';

export interface ItemNavegacao {
  rota: string;
  rotulo: string;
  icone: NomeIcone;
  /** Início casa só a rota exata; os demais casam também as sub-rotas. */
  exato?: boolean;
  /** Rotas de outras seções que mantêm este item ativo (ex.: as despesas fixas pertencem ao Início). */
  rotasAninhadas?: readonly string[];
  /** Telas com seletor de mês: o `mes` acompanha o usuário de uma para outra. */
  levaMes?: boolean;
  /** Presente só no trilho do PC. */
  soNoTrilho?: boolean;
}

export const ITENS_NAVEGACAO: readonly ItemNavegacao[] = [
  { rota: '/', rotulo: 'Início', icone: 'casa', exato: true, levaMes: true, rotasAninhadas: ['/fixas'] },
  { rota: '/lancamentos', rotulo: 'Lançamentos', icone: 'lista', levaMes: true },
  { rota: '/orcamento', rotulo: 'Orçamento', icone: 'grafico', levaMes: true },
  { rota: '/metas', rotulo: 'Metas', icone: 'alvo' },
  { rota: '/ajustes', rotulo: 'Ajustes', icone: 'ajustes', soNoTrilho: true },
];

/** Destino do link do item, com `?mes=` quando o item leva o mês. */
export function destinoDoItem(item: ItemNavegacao, mes?: string): { pathname: string; search: string } {
  const search = item.levaMes && mes ? `?${escreverMesNaUrl(new URLSearchParams(), mes).toString()}` : '';
  return { pathname: item.rota, search };
}
