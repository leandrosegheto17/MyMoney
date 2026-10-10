import type { LinhaContas } from '@mymoney/contrato/respostas/contas';
import { buscarLinha, buscarLinhas } from './cadastro';

export const buscarContas = () => buscarLinhas<LinhaContas>('contas');

export const buscarConta = (id: string) => buscarLinha<LinhaContas>('contas', id);
