import { useEffect, useState } from 'react';
import { ouvirSessao, type obterSessao } from '../dados/sessao';

type Sessao = Awaited<ReturnType<typeof obterSessao>>;

/** Sessão atual; `carregando` vale até a primeira notificação (com ou sem sessão). */
export function useSessao(): { carregando: boolean; sessao: Sessao } {
  const [estado, setEstado] = useState<{ carregando: boolean; sessao: Sessao }>({
    carregando: true,
    sessao: null,
  });
  useEffect(() => ouvirSessao((sessao) => setEstado({ carregando: false, sessao })), []);
  return estado;
}
