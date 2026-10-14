import type { ComponentProps, Ref } from 'react';
import { useAviso } from '../../componentes/base/useAviso';
import { FolhaLancar } from '../../componentes/lancar/FolhaLancar';
import { textoAvisoLancamento } from '../../componentes/lancar/textoAvisoLancamento';
import { useConectado } from '../../ganchos/useConectado';
import { useDadosLancamento } from '../../ganchos/useDadosLancamento';
import { useLancarDespesa, type EntradaLancar } from '../../ganchos/useLancarDespesa';

interface Props {
  aberta: boolean;
  aoFechar: () => void;
  refValor: Ref<HTMLInputElement>;
  /** Abre a folha já preenchida (correção de um envio que falhou). */
  correcao?: ComponentProps<typeof FolhaLancar>['correcao'];
  /** O lançamento foi aceito (enviado ou guardado na fila). */
  aoAceitar?: () => void;
}

const TEXTO_GUARDADO = 'Guardado no aparelho. Será enviado quando houver conexão.';

/** Liga a folha de lançamento aos dados de `dados_lancamento`, à fila de envio e aos avisos. */
export function LancarConectado({ aberta, aoFechar, refValor, correcao, aoAceitar }: Props) {
  const { data } = useDadosLancamento();
  const { lancar } = useLancarDespesa();
  const { mostrar } = useAviso();
  const conectado = useConectado();

  async function aoLancar(entrada: EntradaLancar) {
    const resultado = await lancar(entrada);
    if (resultado.tipo === 'sucesso') mostrar('sucesso', textoAvisoLancamento(resultado.resposta));
    if (resultado.tipo === 'guardado') mostrar('guardado', TEXTO_GUARDADO);
    if (resultado.tipo === 'sucesso' || resultado.tipo === 'guardado') aoAceitar?.();
    return resultado;
  }

  return (
    <FolhaLancar
      aberta={aberta}
      aoFechar={aoFechar}
      refValor={refValor}
      correcao={correcao}
      dados={data?.dados}
      aoLancar={aoLancar}
      offline={!conectado}
    />
  );
}
