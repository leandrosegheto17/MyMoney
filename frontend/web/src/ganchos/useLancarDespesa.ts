import { useCallback, useRef } from 'react';
import type { CodigoErro } from '@mymoney/contrato/erros';
import type { LancarDespesa } from '@mymoney/contrato/respostas/lancar-despesa';
import { fila } from '../dados/fila/fila';
import type { ExibicaoItem } from '../dados/fila/tipos';

/** Depois disso o envio segue em segundo plano e a tela diz que o lançamento está guardado. */
const ESPERA_MAXIMA_MS = 3000;

export interface EntradaLancar {
  valorCentavos: number;
  categoriaId: string;
  formaId: string;
  parcelas: number;
  data: string;
  descricao: string;
  exibicao: ExibicaoItem;
}

export type ResultadoLancar =
  | { tipo: 'sucesso'; resposta: LancarDespesa }
  | { tipo: 'guardado' }
  | { tipo: 'regra'; codigo: CodigoErro }
  /** Não coube na fila (sem sessão ou fila cheia): nada foi gravado. */
  | { tipo: 'erro' };

async function enviar(entrada: EntradaLancar): Promise<ResultadoLancar> {
  // A contagem dos 3 s começa no toque, antes de gravar na fila.
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<ResultadoLancar>((resolver) => {
    temporizador = setTimeout(() => resolver({ tipo: 'guardado' }), ESPERA_MAXIMA_MS);
  });

  let item;
  try {
    item = await fila.enfileirar(
      {
        p_valor_centavos: entrada.valorCentavos,
        p_categoria_id: entrada.categoriaId,
        p_forma_id: entrada.formaId,
        p_parcelas: entrada.parcelas,
        p_data: entrada.data,
        p_descricao: entrada.descricao,
      },
      entrada.exibicao,
    );
  } catch {
    clearTimeout(temporizador);
    return { tipo: 'erro' };
  }

  let resposta: LancarDespesa | undefined;
  const cancelar = fila.assinar((evento) => {
    if (evento.tipo === 'enviado' && evento.item.id === item.id) resposta = evento.resposta;
  });

  const tentativa = fila
    .esvaziar()
    .then(async (): Promise<ResultadoLancar> => {
      if (resposta) return { tipo: 'sucesso', resposta };
      const atual = (await fila.listar()).find((i) => i.id === item.id);
      if (atual?.situacao === 'falhou' && atual.motivo && atual.motivo !== 'desconhecido') {
        // O formulário continua com os dados: corrigir e lançar de novo não pode deixar um item repetido na fila.
        await fila.descartar(item.id, { confirmado: true });
        return { tipo: 'regra', codigo: atual.motivo };
      }
      return { tipo: 'guardado' };
    })
    .catch((): ResultadoLancar => ({ tipo: 'guardado' }))
    .finally(cancelar);

  try {
    return await Promise.race([tentativa, limite]);
  } finally {
    clearTimeout(temporizador);
  }
}

/** Lança a despesa pela fila: grava no aparelho, tenta enviar e espera até 3 s pelo servidor. */
export function useLancarDespesa() {
  const emCurso = useRef<Promise<ResultadoLancar> | null>(null);

  const lancar = useCallback((entrada: EntradaLancar): Promise<ResultadoLancar> => {
    if (emCurso.current) return emCurso.current;
    const envio = enviar(entrada).finally(() => {
      emCurso.current = null;
    });
    emCurso.current = envio;
    return envio;
  }, []);

  return { lancar };
}
