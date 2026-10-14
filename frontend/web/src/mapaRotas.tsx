import type { RouteObject } from 'react-router';
import { AreaAutenticada } from './paginas/AreaAutenticada';
import { AreaPublica } from './paginas/AreaPublica';
import { NaoEncontrada } from './paginas/NaoEncontrada';
import { Inicio } from './paginas/Inicio';
import { Provisoria } from './paginas/Provisoria';
import type { HandleRota } from './ganchos/useTituloDaPagina';
import { estaInstalado } from './pwa/modoInstalado';

const carregarEmConstrucao = () => import('./paginas/EmConstrucao').then((m) => ({ Component: m.EmConstrucao }));

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
    element: <AreaAutenticada />,
    children: [
      { path: '/', element: <Inicio instalado={estaInstalado()} />, handle: { titulo: 'Início', ...comMes } satisfies HandleRota },
      { path: '/lancar', Component: Provisoria, handle: { titulo: 'Lançar' } satisfies HandleRota },
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
            // `paginas/` não importa `pwa/`: a raiz entrega se o app já está instalado.
            Component: () => <m.Ajustes instalado={estaInstalado()} aoInstalar={() => {}} />,
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
      pagina('/ajustes/categorias', 'Categorias', estreito),
      pagina('/ajustes/categorias/nova', 'Nova categoria', estreito),
      pagina('/ajustes/categorias/:id', 'Categoria', estreito),
      { path: '*', Component: NaoEncontrada, handle: { titulo: 'Página não encontrada' } satisfies HandleRota },
    ],
  },
];
