import type { LinhaDespesasFixas } from '@mymoney/contrato/respostas/despesas-fixas';
import { buscarLinha, buscarLinhas } from './cadastro';

/** Inclui as encerradas: quem filtra a exibição é a tela. */
export const buscarDespesasFixas = () => buscarLinhas<LinhaDespesasFixas>('despesas_fixas');

export const buscarDespesaFixa = (id: string) => buscarLinha<LinhaDespesasFixas>('despesas_fixas', id);
