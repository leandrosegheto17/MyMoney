import { Navigate, Outlet } from 'react-router';
import { useSessao } from '../ganchos/useSessao';
import { useTituloDaPagina } from '../ganchos/useTituloDaPagina';

/** Rotas sem moldura; `redirecionaComSessao` manda quem já entrou para o Início. */
export function AreaPublica({ redirecionaComSessao = false }: { redirecionaComSessao?: boolean }) {
  const { carregando, sessao } = useSessao();
  useTituloDaPagina();
  if (carregando) return null;
  if (redirecionaComSessao && sessao) return <Navigate to="/" replace />;
  return <Outlet />;
}
