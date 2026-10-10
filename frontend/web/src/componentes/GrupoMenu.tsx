import { useId, type ReactNode } from 'react';
import lista from './base/Lista.module.css';
import estilo from './GrupoMenu.module.css';

/** Seção de menu com título e lista; o nome da região é o título. */
export function GrupoMenu({ titulo, children }: { titulo: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className={estilo.grupo} aria-labelledby={id}>
      <h2 id={id} className={estilo.titulo}>
        {titulo}
      </h2>
      <ul className={`${lista.lista} ${estilo.lista}`}>{children}</ul>
    </section>
  );
}
