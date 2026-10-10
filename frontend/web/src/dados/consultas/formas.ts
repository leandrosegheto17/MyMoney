import type { LinhaFormasPagamento } from '@mymoney/contrato/respostas/formas-pagamento';
import { buscarLinha, buscarLinhas } from './cadastro';

export const buscarFormas = () => buscarLinhas<LinhaFormasPagamento>('formas_pagamento');

export const buscarForma = (id: string) => buscarLinha<LinhaFormasPagamento>('formas_pagamento', id);
