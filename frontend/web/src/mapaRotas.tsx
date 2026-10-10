import type { RouteObject } from 'react-router';
import { AreaAutenticada } from './paginas/AreaAutenticada';
import { AreaPublica } from './paginas/AreaPublica';
import { NaoEncontrada } from './paginas/NaoEncontrada';
import { Provisoria } from './paginas/Provisoria';
import type { HandleRota } from './ganchos/useTituloDaPagina';

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
    children: [pagina('/entrar', 'Entrar')],
  },
  {
    element: <AreaPublica />,
    children: [pagina('/redefinir-senha', 'Redefinir senha')],
  },
  {
    element: <AreaAutenticada />,
    children: [
      { path: '/', Component: Provisoria, handle: { titulo: 'Início', ...comMes } satisfies HandleRota },
      { path: '/lancar', Component: Provisoria, handle: { titulo: 'Lançar' } satisfies HandleRota },
      pagina('/lancamentos', 'Lançamentos', comMes),
      pagina('/lancamentos/:id', 'Lançamento', estreito),
      pagina('/fixas', 'Despesas fixas', { ...comMes, ...estreito }),
      pagina('/fixas/nova', 'Nova despesa fixa', estreito),
      pagina('/fixas/:id', 'Despesa fixa', estreito),
      pagina('/orcamento', 'Orçamento', comMes),
      pagina('/metas', 'Metas'),
      pagina('/metas/nova', 'Nova meta', estreito),
      pagina('/metas/:id', 'Meta'),
      pagina('/metas/:id/editar', 'Editar meta', estreito),
      pagina('/ajustes', 'Ajustes', estreito),
      pagina('/ajustes/contas', 'Contas', estreito),
      pagina('/ajustes/contas/nova', 'Nova conta', estreito),
      pagina('/ajustes/contas/:id', 'Conta', estreito),
      pagina('/ajustes/formas', 'Formas de pagamento', estreito),
      pagina('/ajustes/formas/nova', 'Nova forma de pagamento', estreito),
      pagina('/ajustes/formas/:id', 'Forma de pagamento', estreito),
      pagina('/ajustes/categorias', 'Categorias', estreito),
      pagina('/ajustes/categorias/nova', 'Nova categoria', estreito),
      pagina('/ajustes/categorias/:id', 'Categoria', estreito),
      { path: '*', Component: NaoEncontrada, handle: { titulo: 'Página não encontrada' } satisfies HandleRota },
    ],
  },
];
