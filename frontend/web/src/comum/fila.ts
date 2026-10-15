import type { Escopo } from '@mymoney/contrato/enums';
import type { CodigoErro } from '@mymoney/contrato/erros';
import type { LancarDespesa } from '@mymoney/contrato/respostas/lancar-despesa';
import type { ArgsRpc } from './rpc';

/** Chamada completa de `lancar_despesa`, com `p_id` gerado no aparelho (chave de idempotência). */
export type ArgsItem = Required<ArgsRpc<'lancar_despesa'>>;

/** Argumentos que quem enfileira informa: `p_id` nasce na fila. */
export type ArgsNovoItem = Omit<ArgsItem, 'p_id'>;

/** O que a tela mostra do item sem rede. */
export type ExibicaoItem = { categoria_nome: string; forma_nome: string; escopo?: Escopo };

export type MotivoFalha = CodigoErro | 'desconhecido';

export type ItemFila = {
  id: string;
  /** `user.id` da sessão que enfileirou; só essa sessão envia, lista ou descarta o item. */
  dono: string;
  args: ArgsItem;
  exibicao: ExibicaoItem;
  /** Epoch em ms. */
  criadoEm: number;
  situacao: 'aguardando' | 'falhou';
  motivo?: MotivoFalha;
};

export type EventoFila =
  | { tipo: 'mudou' }
  | { tipo: 'enviado'; item: ItemFila; resposta: LancarDespesa };
