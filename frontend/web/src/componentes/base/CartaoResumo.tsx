import { useId, type ReactNode } from 'react';
import { Esqueleto } from './Esqueleto';
import { LinhaVazia } from './LinhaVazia';
import estilos from './CartaoResumo.module.css';

interface Props {
  titulo: ReactNode;
  total?: boolean;
  /** Cor da borda do topo; o bloco em si é da tela. */
  bloco: 'casa' | 'eu';
  estado: 'dado' | 'vazio' | 'carregando';
  textoVazio: string;
  acaoVazio?: ReactNode;
  children?: ReactNode;
}

/** Cartão de resumo com os três estados: dado, vazio e carregando. */
export function CartaoResumo({ titulo, total = false, bloco, estado, textoVazio, acaoVazio, children }: Props) {
  const idTitulo = useId();
  const classes = [estilos.cartao, estilos[bloco], total ? estilos['cartao-total'] : ''].filter(Boolean).join(' ');

  if (estado === 'carregando') {
    return (
      <article className={classes} aria-hidden="true">
        <Esqueleto variante="titulo" />
        <Esqueleto variante="valor" />
        <Esqueleto variante="linha" />
        <Esqueleto variante="linha-curta" />
      </article>
    );
  }

  return (
    <article className={classes} aria-labelledby={idTitulo}>
      <h3 id={idTitulo}>{titulo}</h3>
      {estado === 'vazio' ? (
        <>
          <LinhaVazia>{textoVazio}</LinhaVazia>
          {acaoVazio}
        </>
      ) : (
        children
      )}
    </article>
  );
}
