import { useEffect, useState, type ReactNode } from 'react';

interface Props {
  /** Espera antes de mostrar o esqueleto; respostas rápidas não piscam (UX-SPEC §4). */
  atrasoMs?: number;
  children: ReactNode;
}

export function CarregandoComAtraso({ atrasoMs = 300, children }: Props) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisivel(true), atrasoMs);
    return () => clearTimeout(id);
  }, [atrasoMs]);

  if (!visivel) return null;
  return (
    <>
      <p className="visualmente-oculto" role="status">
        Carregando…
      </p>
      <div aria-hidden="true">{children}</div>
    </>
  );
}
