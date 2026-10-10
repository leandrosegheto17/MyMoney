import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { inicializarMembro } from '../dados/comandos/inicializarMembro';
import { CHAVES } from './chavesConsulta';

/** Cria as categorias iniciais do membro depois do login e recarrega a lista de categorias. */
export function useInicializarMembro(userId: string | undefined): void {
  const cliente = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    void inicializarMembro(userId).then(() => cliente.invalidateQueries({ queryKey: CHAVES.categorias }));
  }, [userId, cliente]);
}
