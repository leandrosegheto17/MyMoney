import type { ReactNode } from 'react';
import { Icone } from '../base/Icone';
import estilos from './BlocoInicio.module.css';

interface Props {
  bloco: 'casa' | 'eu';
  /** Nome do membro no bloco Eu ("Eu · Leandro"). */
  nome?: string;
  /** No esqueleto o bloco só é nomeado por rótulo e a grade é decorativa. */
  carregando?: boolean;
  children: ReactNode;
}

/** Bloco da Início: título `h2` com ícone e a grade de cartões. */
export function BlocoInicio({ bloco, nome, carregando = false, children }: Props) {
  const idTitulo = `titulo-${bloco}`;
  const rotulo = bloco === 'casa' ? 'Casa' : 'Eu';
  const nomeacao = carregando ? { 'aria-label': rotulo } : { 'aria-labelledby': idTitulo };
  return (
    <section className={`${estilos.bloco} ${estilos[bloco]}`} {...nomeacao}>
      <h2 className={estilos['bloco-titulo']} id={carregando ? undefined : idTitulo}>
        <Icone nome={bloco === 'casa' ? 'casa' : 'pessoa'} />
        {rotulo}
        {nome ? (
          <>
            {' '}
            <span className={estilos.nome}>· {nome}</span>
          </>
        ) : null}
      </h2>
      <div className={estilos.grade} aria-hidden={carregando ? true : undefined}>
        {children}
      </div>
    </section>
  );
}
