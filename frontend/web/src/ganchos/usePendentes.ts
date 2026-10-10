import { useEffect, useState } from 'react';
import { fila } from '../dados/fila/fila';

export type Pendentes = { total: number; aguardando: number; falhas: number };

const ZERO: Pendentes = { total: 0, aguardando: 0, falhas: 0 };

/** Itens da fila do membro atual; os de outro membro nunca entram na conta. */
export function usePendentes(): Pendentes {
  const [pendentes, setPendentes] = useState<Pendentes>(ZERO);
  useEffect(() => {
    let ativo = true;
    const atualizar = async () => {
      const itens = await fila.listar();
      if (!ativo) return;
      const aguardando = itens.filter((i) => i.situacao === 'aguardando').length;
      setPendentes((atual) =>
        atual.total === itens.length && atual.aguardando === aguardando
          ? atual
          : { total: itens.length, aguardando, falhas: itens.length - aguardando },
      );
    };
    void atualizar();
    const cancelar = fila.assinar(() => void atualizar());
    return () => {
      ativo = false;
      cancelar();
    };
  }, []);
  return pendentes;
}
