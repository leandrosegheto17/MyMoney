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
  /** Nível do título; `3` quando o estado vive dentro de uma folha que já tem o `h2`. */
  nivel?: 2 | 3;
  /** Sem a margem superior, para o estado encostar no topo do contêiner (folha). */
  semMargem?: boolean;
}

export function EstadoVazio({ icone, titulo, texto, acao, papel, nivel = 2, semMargem }: Props) {
  const Titulo = nivel === 3 ? 'h3' : 'h2';
  const idTitulo = papel ? 'erro-titulo' : nivel === 3 ? 'vazio-titulo' : undefined;
  return (
    <section
      className={`${estilos.estado}${semMargem ? ` ${estilos.semMargem}` : ''}`}
      role={papel}
      aria-labelledby={idTitulo}
    >
      <Icone nome={icone} />
      <Titulo id={idTitulo}>{titulo}</Titulo>
      {texto ? <p>{texto}</p> : null}
      {acao}
    </section>
  );
}
