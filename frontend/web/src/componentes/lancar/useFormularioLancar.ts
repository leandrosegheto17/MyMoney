import { useState } from 'react';
import type { DadosLancamento } from '@mymoney/contrato/respostas/dados-lancamento';
import { hojeEmSaoPaulo } from '../../formatacao/data';

export interface EstadoLancar {
  valorCentavos: number;
  categoriaId: string | null;
  formaId: string | null;
  parcelas: number;
  data: string;
  descricao: string;
}

/** Estado de tela da folha de lançamento; nada aqui vem do servidor. */
export function useFormularioLancar(_dados?: DadosLancamento) {
  const [estado, setEstado] = useState<EstadoLancar>(() => ({
    valorCentavos: 0,
    categoriaId: null,
    formaId: null,
    parcelas: 1,
    data: hojeEmSaoPaulo(),
    descricao: '',
  }));

  function mudar<C extends keyof EstadoLancar>(campo: C, valor: EstadoLancar[C]) {
    setEstado((atual) => ({ ...atual, [campo]: valor }));
  }

  return { estado, mudar };
}
