import type { DadosLancamento } from '@mymoney/contrato/respostas/dados-lancamento';
import type { FiltrosDaLista } from '../../ganchos/useLancamentosMes';
import estilos from './FiltrosLancamentos.module.css';

interface Props {
  filtros: FiltrosDaLista;
  aoMudar: (filtros: FiltrosDaLista) => void;
  categorias: DadosLancamento['categorias_despesa'];
  formas: DadosLancamento['formas'];
}

/** Faixa de filtros da lista; por ora só o grupo, sem botões. */
export function FiltrosLancamentos(_props: Props) {
  return <div className={estilos.filtros} role="group" aria-label="Filtros" />;
}
