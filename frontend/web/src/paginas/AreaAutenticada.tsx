import { useRef } from 'react';
import { flushSync } from 'react-dom';
import { Navigate, Outlet, useSearchParams } from 'react-router';
import { RegiaoAvisos } from '../componentes/base/RegiaoAvisos';
import { EstruturaApp } from '../componentes/EstruturaApp';
import { lerMesDaUrl } from '../formatacao/mes';
import { useContexto } from '../ganchos/useContexto';
import { useEnvioAutomatico } from '../ganchos/useEnvioAutomatico';
import { useInicializarMembro } from '../ganchos/useInicializarMembro';
import { useSessao } from '../ganchos/useSessao';
import { useHandleDaRota, useTituloDaPagina } from '../ganchos/useTituloDaPagina';
import { LancarConectado } from './lancar/LancarConectado';
import { useAberturaLancar } from './lancar/useAberturaLancar';

function Estrutura() {
  const [params] = useSearchParams();
  const handle = useHandleDaRota();
  const mesDaUrl = lerMesDaUrl(params);
  const contexto = useContexto();
  useTituloDaPagina(mesDaUrl ?? contexto.data?.mes_corrente);
  const { aberta, abrir, fechar } = useAberturaLancar();
  const refValor = useRef<HTMLInputElement>(null);

  // Mostrar a folha e focar o valor no mesmo handler síncrono: o iOS só abre o teclado
  // se o foco acontece dentro do gesto do toque.
  function lancar() {
    flushSync(abrir);
    refValor.current?.focus();
  }

  return (
    <>
      <EstruturaApp aoLancar={lancar} mes={mesDaUrl ?? undefined} estreito={handle?.estreito}>
        <Outlet />
      </EstruturaApp>
      <LancarConectado aberta={aberta} aoFechar={fechar} refValor={refValor} />
    </>
  );
}

/** Guarda de navegação: sem sessão vai para /entrar; a proteção dos dados é o RLS. */
export function AreaAutenticada() {
  const { carregando, sessao } = useSessao();
  useInicializarMembro(sessao?.user.id);
  useEnvioAutomatico();
  if (carregando) return null;
  if (!sessao) return <Navigate to="/entrar" replace />;
  return (
    <RegiaoAvisos>
      <Estrutura />
    </RegiaoAvisos>
  );
}
