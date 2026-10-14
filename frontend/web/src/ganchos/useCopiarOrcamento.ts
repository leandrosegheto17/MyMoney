import type { Escopo } from '@mymoney/contrato/enums';
import { useAviso } from '../componentes/base/useAviso';
import { mensagemErro } from '../rotulos/mensagensErro';
import { useComandosOrcamento } from './useComandosOrcamento';

/** Copia o orçamento do mês anterior e avisa o resultado; em erro nada muda na tela. */
export function useCopiarOrcamento(mes: string, escopo: Escopo, nomeMesOrigem: string) {
  const { mostrar } = useAviso();
  const { copiarOrcamento } = useComandosOrcamento();

  function copiar() {
    copiarOrcamento.mutate(
      { mes, escopo },
      {
        onSuccess: () => mostrar('sucesso', `Orçamento copiado de ${nomeMesOrigem}`),
        onError: (erro) =>
          mostrar('erro', erro.tipo === 'rede' ? 'Sem conexão. O orçamento não foi copiado.' : mensagemErro(erro)),
      },
    );
  }

  return { copiar, copiando: copiarOrcamento.isPending };
}
