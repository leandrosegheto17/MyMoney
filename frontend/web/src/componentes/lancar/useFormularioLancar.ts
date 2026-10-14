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

export interface ErrosLancar {
  valor?: string;
  categoria?: string;
}

const ERRO_CAMPO: Partial<Record<keyof EstadoLancar, keyof ErrosLancar>> = {
  valorCentavos: 'valor',
  categoriaId: 'categoria',
};

const novoEstado = (): EstadoLancar => ({
  valorCentavos: 0,
  categoriaId: null,
  formaId: null,
  parcelas: 1,
  data: hojeEmSaoPaulo(),
  descricao: '',
});

/** Estado de tela da folha de lançamento; a forma vem de `dados_lancamento` enquanto não for escolhida. */
export function useFormularioLancar(dados?: DadosLancamento) {
  const [estado, setEstado] = useState<EstadoLancar>(novoEstado);
  const [erros, setErros] = useState<ErrosLancar>({});

  function mudar<C extends keyof EstadoLancar>(campo: C, valor: EstadoLancar[C]) {
    const campoComErro = ERRO_CAMPO[campo];
    if (campoComErro) setErros((atuais) => ({ ...atuais, [campoComErro]: undefined }));
    setEstado((atual) => {
      const proximo = { ...atual, [campo]: valor };
      if (campo === 'formaId') {
        const tipo = dados?.formas.find((f) => f.id === valor)?.tipo;
        if (tipo !== 'credito') proximo.parcelas = 1;
      }
      return proximo;
    });
  }

  /** Confere os campos obrigatórios; devolve se estão todos preenchidos. */
  function validar(): boolean {
    const novos: ErrosLancar = {};
    if (estado.valorCentavos <= 0) novos.valor = 'Informe um valor maior que zero.';
    if (!estado.categoriaId) novos.categoria = 'Escolha uma categoria.';
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  /** Depois de lançar: tudo volta ao início, menos a forma de pagamento. */
  function limpar() {
    setEstado((atual) => ({ ...novoEstado(), formaId: atual.formaId }));
    setErros({});
  }

  const formaId = estado.formaId ?? (dados ? formaInicial(dados) : null);
  return { estado: { ...estado, formaId }, erros, mudar, validar, limpar };
}
