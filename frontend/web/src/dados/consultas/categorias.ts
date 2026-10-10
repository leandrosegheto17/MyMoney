import type { LinhaCategorias } from '@mymoney/contrato/respostas/categorias';
import { buscarLinha, buscarLinhas } from './cadastro';

export const buscarCategorias = () => buscarLinhas<LinhaCategorias>('categorias');

export const buscarCategoria = (id: string) => buscarLinha<LinhaCategorias>('categorias', id);
