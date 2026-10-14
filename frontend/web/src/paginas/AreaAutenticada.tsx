import { useRef, useState, type ComponentProps } from 'react';
import { flushSync } from 'react-dom';
import { Navigate, Outlet, useSearchParams } from 'react-router';
import { ProvedorInstalar } from '../componentes/instalar/ProvedorInstalar';
import { RegiaoAvisos } from '../componentes/base/RegiaoAvisos';
import { EstruturaApp } from '../componentes/EstruturaApp';
import { correcaoDoItem } from '../componentes/envios/correcaoDoItem';
import { lerMesDaUrl } from '../formatacao/mes';
import { useAcoesFila } from '../ganchos/useAcoesFila';
import { useContexto } from '../ganchos/useContexto';
import { useEnvioAutomatico } from '../ganchos/useEnvioAutomatico';
import { useInicializarMembro } from '../ganchos/useInicializarMembro';
import { useSessao } from '../ganchos/useSessao';
import type { ItemFila } from '../ganchos/usePendentes';
import { useHandleDaRota, useTituloDaPagina } from '../ganchos/useTituloDaPagina';
import { EnviosConectado } from './envios/EnviosConectado';
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
  const acoes = useAcoesFila();
  const [correcao, setCorrecao] = useState<ComponentProps<typeof LancarConectado>['correcao']>();

  // Mostrar a folha e focar o valor no mesmo handler síncrono: o iOS só abre o teclado
  // se o foco acontece dentro do gesto do toque.
  function lancar() {
    flushSync(abrir);
    refValor.current?.focus();
  }

  function corrigir(item: ItemFila) {
    flushSync(() => {
      setCorrecao((atual) => ({ chave: (atual?.chave ?? 0) + 1, valores: correcaoDoItem(item) }));
      abrir();
    });
    refValor.current?.focus();
  }

  function fecharLancar() {
    acoes.cancelarCorrecao();
    fechar();
  }

  return (
    <>
      <EstruturaApp aoLancar={lancar} mes={mesDaUrl ?? undefined} estreito={handle?.estreito}>
        <Outlet />
      </EstruturaApp>
      <LancarConectado
        aberta={aberta}
        aoFechar={fecharLancar}
        refValor={refValor}
        correcao={correcao}
        aoAceitar={() => void acoes.concluirCorrecao()}
      />
      <EnviosConectado acoes={acoes} aoCorrigir={corrigir} />
    </>
  );
}

type PropsInstalar = Omit<ComponentProps<typeof ProvedorInstalar>, 'children'>;

/** Guarda de navegação: sem sessão vai para /entrar; a proteção dos dados é o RLS. */
export function AreaAutenticada(instalacao: PropsInstalar) {
  const { carregando, sessao } = useSessao();
  useInicializarMembro(sessao?.user.id);
  useEnvioAutomatico();
  if (carregando) return null;
  if (!sessao) return <Navigate to="/entrar" replace />;
  return (
    <RegiaoAvisos>
      <ProvedorInstalar {...instalacao}>
        <Estrutura />
      </ProvedorInstalar>
    </RegiaoAvisos>
  );
}
