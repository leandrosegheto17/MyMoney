import { flushSync } from 'react-dom';
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { DadosLancamento } from '@mymoney/contrato/respostas/dados-lancamento';
import type { EntradaLancar, ResultadoLancar } from '../../ganchos/useLancarDespesa';
import { ROTULO_ERRO, TEXTO_ERRO_GENERICO } from '../../rotulos/erros';
import { focarPrimeiroErro } from '../base/focarPrimeiroErro';
import type { EstadoLancar } from './useFormularioLancar';

interface Entradas {
  dados?: DadosLancamento;
  estado: EstadoLancar;
  validar: () => boolean;
  limpar: () => void;
  aoLancar?: (entrada: EntradaLancar) => Promise<ResultadoLancar>;
}

/** Validação, envio e o que a folha faz com o resultado: limpar e focar o valor, ou mostrar o erro no topo. */
export function useEnvioLancar({ dados, estado, validar, limpar, aoLancar }: Entradas) {
  const formulario = useRef<HTMLFormElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erroTopo, setErroTopo] = useState<string>();

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (ocupado || !dados) return;
    let valido = false;
    // O foco vai para o campo que acabou de ganhar aria-invalid, então o erro precisa estar no DOM.
    flushSync(() => {
      valido = validar();
    });
    if (!valido) {
      if (formulario.current) focarPrimeiroErro(formulario.current);
      return;
    }
    const categoria = dados.categorias_despesa.find((c) => c.id === estado.categoriaId);
    const forma = dados.formas.find((f) => f.id === estado.formaId);
    if (!aoLancar || !categoria || !forma) return;

    setErroTopo(undefined);
    setOcupado(true);
    const resultado = await aoLancar({
      valorCentavos: estado.valorCentavos,
      categoriaId: categoria.id,
      formaId: forma.id,
      parcelas: estado.parcelas,
      data: estado.data,
      descricao: estado.descricao,
      exibicao: { categoria_nome: categoria.nome, forma_nome: forma.nome, escopo: categoria.escopo },
    }).catch((): ResultadoLancar => ({ tipo: 'erro' }));
    setOcupado(false);

    if (resultado.tipo === 'regra') setErroTopo(ROTULO_ERRO[resultado.codigo].texto);
    else if (resultado.tipo === 'erro') setErroTopo(TEXTO_ERRO_GENERICO);
    else {
      limpar();
      formulario.current?.querySelector<HTMLElement>('#valor')?.focus();
    }
  }

  /** Ctrl ou ⌘ + Enter segue o mesmo caminho do botão. */
  function aoTeclar(evento: KeyboardEvent<HTMLFormElement>) {
    if (evento.key !== 'Enter' || !(evento.ctrlKey || evento.metaKey)) return;
    evento.preventDefault();
    evento.currentTarget.requestSubmit();
  }

  return { formulario, ocupado, erroTopo, aoEnviar, aoTeclar };
}
