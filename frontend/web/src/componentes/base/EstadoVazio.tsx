import type { ReactNode } from 'react';
import { Icone, type NomeIcone } from './Icone';
import estilos from './Estado.module.css';

interface Props {
  icone: NomeIcone;
  titulo: string;
  texto?: string;
  acao?: ReactNode;
}

export function EstadoVazio({ icone, titulo, texto, acao }: Props) {
  return (
    <section className={estilos.estado}>
      <Icone nome={icone} />
      <h2>{titulo}</h2>
      {texto ? <p>{texto}</p> : null}
      {acao}
    </section>
  );
}
