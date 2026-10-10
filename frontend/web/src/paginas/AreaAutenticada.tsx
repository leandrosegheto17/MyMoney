import { Navigate, Outlet, useNavigate, useSearchParams } from 'react-router';
import { EstruturaApp } from '../componentes/EstruturaApp';
import { lerMesDaUrl } from '../formatacao/mes';
import { useContexto } from '../ganchos/useContexto';
import { useEnvioAutomatico } from '../ganchos/useEnvioAutomatico';
import { useInicializarMembro } from '../ganchos/useInicializarMembro';
import { useSessao } from '../ganchos/useSessao';
import { useHandleDaRota, useTituloDaPagina } from '../ganchos/useTituloDaPagina';

function Estrutura() {
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const handle = useHandleDaRota();
  const mesDaUrl = lerMesDaUrl(params);
  const contexto = useContexto();
  useTituloDaPagina(mesDaUrl ?? contexto.data?.mes_corrente);
  return (
    <EstruturaApp aoLancar={() => navegar('/lancar')} mes={mesDaUrl ?? undefined} estreito={handle?.estreito}>
      <Outlet />
    </EstruturaApp>
  );
}

/** Guarda de navegação: sem sessão vai para /entrar; a proteção dos dados é o RLS. */
export function AreaAutenticada() {
  const { carregando, sessao } = useSessao();
  useInicializarMembro(sessao?.user.id);
  useEnvioAutomatico();
  if (carregando) return null;
  if (!sessao) return <Navigate to="/entrar" replace />;
  return <Estrutura />;
}
