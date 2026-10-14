import { useState } from 'react';
import type { DadosLancamento } from '@mymoney/contrato/respostas/dados-lancamento';
import { hojeEmSaoPaulo } from '../../formatacao/data';
import { formaInicial } from './formaInicial';

export interface EstadoLancar {
  valorCentavos: number;
  categoriaId: string | null;
  formaId: string | null;
  parcelas: number;
  data: string;
  descricao: string;
}

/** Estado de tela da folha de lançamento; a forma vem de `dados_lancamento` enquanto não for escolhida. */
export function useFormularioLancar(dados?: DadosLancamento) {
  const [estado, setEstado] = useState<EstadoLancar>(() => ({
    valorCentavos: 0,
    categoriaId: null,
    formaId: null,
    parcelas: 1,
    data: hojeEmSaoPaulo(),
    descricao: '',
  }));

  function mudar<C extends keyof EstadoLancar>(campo: C, valor: EstadoLancar[C]) {
    setEstado((atual) => {
      const proximo = { ...atual, [campo]: valor };
      if (campo === 'formaId') {
        const tipo = dados?.formas.find((f) => f.id === valor)?.tipo;
        if (tipo !== 'credito') proximo.parcelas = 1;
      }
      return proximo;
    });
  }

  const formaId = estado.formaId ?? (dados ? formaInicial(dados) : null);
  return { estado: { ...estado, formaId }, mudar };
}
