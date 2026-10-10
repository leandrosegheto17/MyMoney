import type { ReactNode } from 'react';
import { Link } from 'react-router';
import estilo from './LinkMais.module.css';

type Props = { children: ReactNode; centralizado?: boolean } & (
  | { para: string; aoClicar?: never }
  | { aoClicar: () => void; para?: never }
);

/** Ação discreta de texto: link de navegação (`para`) ou botão (`aoClicar`). */
export function LinkMais({ children, centralizado, para, aoClicar }: Props) {
  const classe = [estilo['link-mais'], centralizado ? estilo.centro : null].filter(Boolean).join(' ');
  if (para !== undefined) {
    return (
      <Link to={para} className={classe}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={classe} onClick={aoClicar}>
      {children}
    </button>
  );
}
