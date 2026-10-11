import type { ReactNode } from 'react';
import { Icone, type NomeIcone } from './Icone';
import estilos from './Estado.module.css';

interface Props {
  icone: NomeIcone;
  titulo: string;
  texto?: string;
  acao?: ReactNode;
  /** `alert` quando o estado substitui o conteúdo da tela por um erro (ex.: item que não existe mais). */
  papel?: 'alert';
}

export function EstadoVazio({ icone, titulo, texto, acao, papel }: Props) {
  return (
    <section className={estilos.estado} role={papel} aria-labelledby={papel ? 'erro-titulo' : undefined}>
      <Icone nome={icone} />
      <h2 id={papel ? 'erro-titulo' : undefined}>{titulo}</h2>
      {texto ? <p>{texto}</p> : null}
      {acao}
    </section>
  );
}
