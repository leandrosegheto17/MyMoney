import { useId, type FormEvent, type ReactNode } from 'react';
import { Icone } from './base/Icone';
import estilo from './CartaoAcesso.module.css';

interface Props {
  titulo: string;
  aoEnviar: () => void;
  ocupado?: boolean;
  children: ReactNode;
}

/** Moldura das telas públicas de acesso: logo, título da página e o formulário. */
export function CartaoAcesso({ titulo, aoEnviar, ocupado, children }: Props) {
  const idTitulo = useId();

  function aoSubmeter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    aoEnviar();
  }

  return (
    <main className={estilo['tela-entrar']}>
      <form
        className={estilo['cartao-entrar']}
        aria-labelledby={idTitulo}
        aria-busy={ocupado ? 'true' : undefined}
        onSubmit={aoSubmeter}
        noValidate
      >
        <p className={estilo.logo}>
          <Icone nome="casa" />
          MyMoney
        </p>
        <h1 id={idTitulo} className={estilo['titulo-pagina']}>
          {titulo}
        </h1>
        {children}
      </form>
    </main>
  );
}
