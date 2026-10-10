import type { ReactNode } from 'react';
import { CarregandoComAtraso } from './base/CarregandoComAtraso';
import { EstadoErro } from './base/EstadoErro';
import { Faixa } from './base/Faixa';
import { formatarHora } from '../formatacao/data';
import type { LeituraComCache } from '../ganchos/useLeituraComCache';

interface Props<T> {
  leitura: LeituraComCache<T>;
  esqueleto: ReactNode;
  aoTentarDeNovo: () => void;
  children: (dados: T) => ReactNode;
}

/** Os quatro caminhos de uma leitura. O estado vazio continua na tela. */
export function EstadosDeLeitura<T>({ leitura, esqueleto, aoTentarDeNovo, children }: Props<T>) {
  const { situacao, dados, atualizadoEm } = leitura;
  if (situacao === 'carregando') return <CarregandoComAtraso>{esqueleto}</CarregandoComAtraso>;
  if (dados === undefined) return <EstadoErro aoTentarDeNovo={aoTentarDeNovo} />;
  return (
    <>
      {situacao === 'cache' ? <Faixa variante="cache" hora={formatarHora(atualizadoEm)} /> : null}
      {children(dados)}
    </>
  );
}
