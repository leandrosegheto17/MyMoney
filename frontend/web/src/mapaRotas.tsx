import type { RouteObject } from 'react-router';
import { AreaAutenticada } from './paginas/AreaAutenticada';
import { AreaPublica } from './paginas/AreaPublica';
import { NaoEncontrada } from './paginas/NaoEncontrada';
import { Inicio } from './paginas/Inicio';
import type { HandleRota } from './ganchos/useTituloDaPagina';
import { useInstalar } from './componentes/instalar/ContextoInstalar';
import { dispensar, pedirInstalacao } from './pwa/instalacao';
import { useInstalacao } from './pwa/useInstalacao';

const carregarEmConstrucao = () => import('./paginas/EmConstrucao').then((m) => ({ Component: m.EmConstrucao }));

/** `paginas/` não importa `pwa/`: a raiz liga o estado de instalação à área autenticada. */
function AreaComInstalacao() {
  const { plataforma, instalado, temPrompt, mostrarFaixa } = useInstalacao();
  return (
    <AreaAutenticada
      plataforma={plataforma}
      instalado={instalado}
      temPrompt={temPrompt}
      mostrarFaixa={mostrarFaixa}
      aoPedirPrompt={() => void pedirInstalacao().catch(() => {})}
      aoDispensar={dispensar}
    />
  );
}

function InicioInstalavel() {
  return <Inicio instalado={useInstalacao().instalado} />;
}

function AjustesInstalavel({ Ajustes }: { Ajustes: typeof import('./paginas/Ajustes').Ajustes }) {
  const { instalar } = useInstalar();
  return <Ajustes instalado={useInstalacao().instalado} aoInstalar={instalar} />;
}

/** Rota preguiçosa; cada tela troca o `lazy` pela sua página. */
function pagina(path: string, titulo: string, opcoes: Omit<HandleRota, 'titulo'> = {}): RouteObject {
  const handle: HandleRota = { titulo, ...opcoes };
  return { path, lazy: carregarEmConstrucao, handle };
}

const estreito = { estreito: true };
const comMes = { comMes: true };

export const mapaRotas: RouteObject[] = [
  {
    element: <AreaPublica redirecionaComSessao />,
    children: [
      {
        path: '/entrar',
        lazy: () => import('./paginas/Entrar').then((m) => ({ Component: m.Entrar })),
        handle: { titulo: 'Entrar' } satisfies HandleRota,
      },
    ],
  },
  {
    element: <AreaPublica />,
    children: [
      {
        path: '/redefinir-senha',
        lazy: () => import('./paginas/RedefinirSenha').then((m) => ({ Component: m.RedefinirSenha })),
        handle: { titulo: 'Redefinir senha' } satisfies HandleRota,
      },
    ],
  },
  {
    element: <AreaComInstalacao />,
    children: [
      { path: '/', element: <InicioInstalavel />, handle: { titulo: 'Início', ...comMes } satisfies HandleRota },
      { path: '/lancar', element: <InicioInstalavel />, handle: { titulo: 'Lançar' } satisfies HandleRota },
      {
        path: '/lancamentos',
        lazy: () => import('./paginas/Lancamentos').then((m) => ({ Component: m.Lancamentos })),
        handle: { titulo: 'Lançamentos', ...comMes } satisfies HandleRota,
      },
      {
        path: '/lancamentos/:id',
        lazy: () => import('./paginas/Lancamento').then((m) => ({ Component: m.Lancamento })),
        handle: { titulo: 'Lançamento', ...estreito } satisfies HandleRota,
      },
      {
        path: '/fixas',
        lazy: () => import('./paginas/DespesasFixas').then((m) => ({ Component: m.DespesasFixas })),
        handle: { titulo: 'Despesas fixas', ...comMes, ...estreito } satisfies HandleRota,
      },
      {
        path: '/fixas/nova',
        lazy: () => import('./paginas/DespesaFixa').then((m) => ({ Component: m.DespesaFixa })),
        handle: { titulo: 'Nova despesa fixa', ...estreito } satisfies HandleRota,
      },
      {
        path: '/fixas/:id',
        lazy: () => import('./paginas/DespesaFixa').then((m) => ({ Component: m.DespesaFixa })),
        handle: { titulo: 'Despesa fixa', ...estreito } satisfies HandleRota,
      },
      pagina('/orcamento', 'Orçamento', comMes),
      pagina('/metas', 'Metas'),
      pagina('/metas/nova', 'Nova meta', estreito),
      {
        path: '/metas/:id',
        lazy: () => import('./paginas/Meta').then((m) => ({ Component: m.Meta })),
        handle: { titulo: 'Meta' } satisfies HandleRota,
      },
      pagina('/metas/:id/editar', 'Editar meta', estreito),
      {
        path: '/ajustes',
        lazy: () =>
          import('./paginas/Ajustes').then((m) => ({
            Component: () => <AjustesInstalavel Ajustes={m.Ajustes} />,
          })),
        handle: { titulo: 'Ajustes', ...estreito } satisfies HandleRota,
      },
      {
        path: '/ajustes/contas',
        lazy: () => import('./paginas/Contas').then((m) => ({ Component: m.Contas })),
        handle: { titulo: 'Contas', ...estreito } satisfies HandleRota,
      },
      {
        path: '/ajustes/contas/nova',
        lazy: () => import('./paginas/Conta').then((m) => ({ Component: m.Conta })),
        handle: { titulo: 'Nova conta', ...estreito } satisfies HandleRota,
      },
      {
        path: '/ajustes/contas/:id',
        lazy: () => import('./paginas/Conta').then((m) => ({ Component: m.Conta })),
        handle: { titulo: 'Conta', ...estreito } satisfies HandleRota,
      },
      {
        path: '/ajustes/formas',
        lazy: () => import('./paginas/FormasPagamento').then((m) => ({ Component: m.FormasPagamento })),
        handle: { titulo: 'Formas de pagamento', ...estreito } satisfies HandleRota,
      },
      {
        path: '/ajustes/formas/nova',
        lazy: () => import('./paginas/FormaPagamento').then((m) => ({ Component: m.FormaPagamento })),
        handle: { titulo: 'Nova forma de pagamento', ...estreito } satisfies HandleRota,
      },
      {
        path: '/ajustes/formas/:id',
        lazy: () => import('./paginas/FormaPagamento').then((m) => ({ Component: m.FormaPagamento })),
        handle: { titulo: 'Forma de pagamento', ...estreito } satisfies HandleRota,
      },
      {
        path: '/ajustes/categorias',
        lazy: () => import('./paginas/Categorias').then((m) => ({ Component: m.Categorias })),
        handle: { titulo: 'Categorias', ...estreito } satisfies HandleRota,
      },
      {
        path: '/ajustes/categorias/nova',
        lazy: () => import('./paginas/Categoria').then((m) => ({ Component: m.Categoria })),
        handle: { titulo: 'Nova categoria', ...estreito } satisfies HandleRota,
      },
      {
        path: '/ajustes/categorias/:id',
        lazy: () => import('./paginas/Categoria').then((m) => ({ Component: m.Categoria })),
        handle: { titulo: 'Categoria', ...estreito } satisfies HandleRota,
      },
      { path: '*', Component: NaoEncontrada, handle: { titulo: 'Página não encontrada' } satisfies HandleRota },
    ],
  },
];
