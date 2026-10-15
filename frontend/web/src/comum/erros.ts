import type { CodigoErro } from '@mymoney/contrato/erros';

export type ErroDados =
  | { tipo: 'rede' }
  | { tipo: 'indisponivel' }
  | { tipo: 'autenticacao' }
  | { tipo: 'regra'; codigo: CodigoErro }
  | { tipo: 'desconhecido' };
