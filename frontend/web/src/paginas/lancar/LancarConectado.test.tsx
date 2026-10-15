import 'fake-indexeddb/auto';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DadosLancamento } from '@mymoney/contrato/respostas/dados-lancamento';
import { lerResposta } from '../../../test/apoio/fetchSimulado';
import { mapaRotas } from '../../mapaRotas';

const { sessao } = vi.hoisted(() => {
  const ouvintes = new Set<() => void>();
  const sessaoFalsa = { user: { id: '00000000-0000-4000-8000-0000000000aa' }, access_token: 'token-falso' };
  let atual: typeof sessaoFalsa | null = sessaoFalsa;
  return {
    sessao: {
      falsa: sessaoFalsa,
      atual: () => atual,
      definir(nova: typeof sessaoFalsa | null) {
        atual = nova;
        ouvintes.forEach((o) => o());
      },
      assinar(o: () => void) {
        ouvintes.add(o);
        return () => ouvintes.delete(o);
      },
    },
  };
});

const { buscarDadosLancamento } = vi.hoisted(() => ({
  buscarDadosLancamento: vi.fn(),
}));

vi.mock('../../ganchos/useSessao', () => ({
  useSessao: () => {
    const atual = useSyncExternalStore(sessao.assinar, sessao.atual);
    return { carregando: false, sessao: atual };
  },
}));

vi.mock('../../dados/sessao', () => ({
  obterSessao: vi.fn(async () => sessao.atual()),
  ouvirSessao: vi.fn((cb: (s: unknown) => void) => {
    cb(sessao.atual());
    return () => {};
  }),
  garantirSessaoValida: vi.fn(async () => 'valida'),
  sair: vi.fn(async () => {}),
  sairDeTodos: vi.fn(async () => {}),
}));

vi.mock('../../dados/consultas/contexto', async () => {
  const { lerResposta: ler } = await import('../../../test/apoio/fetchSimulado');
  return { buscarContexto: vi.fn(async () => ler('contexto.json')) };
});

vi.mock('../../dados/consultas/resumoMes', async () => {
  const { lerResposta: ler } = await import('../../../test/apoio/fetchSimulado');
  return { buscarResumoMes: vi.fn(async () => ler('resumo-mes.json')) };
});

vi.mock('../../dados/consultas/dadosLancamento', () => ({
  buscarDadosLancamento,
  lerDadosDoAparelho: vi.fn(async () => undefined),
}));

vi.mock('../../dados/fila/envioAutomatico', () => ({
  iniciarEnvioAutomatico: vi.fn(() => () => {}),
}));

vi.mock('../../dados/comandos/lancarDespesa', () => ({
  lancarDespesa: vi.fn(() => new Promise(() => {})),
}));

const dados = lerResposta<DadosLancamento>('dados-lancamento.json');

function navegar(rota: string) {
  const clienteConsulta = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(mapaRotas, { initialEntries: [rota] });
  const resultado = render(
    <QueryClientProvider client={clienteConsulta}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, ...resultado };
}

function folha() {
  return document.querySelector<HTMLElement>('[role="dialog"]');
}

async function esperarFolhaMontada() {
  await waitFor(() => expect(folha()).not.toBeNull());
  await waitFor(() => expect(document.getElementById('valor')).not.toBeNull());
  return folha() as HTMLElement;
}

async function botoesLancar() {
  await waitFor(() => expect(screen.getAllByRole('navigation')).toHaveLength(2));
  const [trilho, barra] = screen.getAllByRole('navigation');
  const doTrilho = trilho.querySelector<HTMLAnchorElement>('a[href^="/lancar"]');
  const daBarra = barra.querySelector<HTMLAnchorElement>('a[href^="/lancar"]');
  return { doTrilho: doTrilho as HTMLAnchorElement, daBarra: daBarra as HTMLAnchorElement };
}

beforeEach(() => {
  vi.mocked(buscarDadosLancamento).mockResolvedValue({ dados, doAparelho: false, salvoEm: Date.now() });
  sessao.definir(sessao.falsa);
  vi.stubGlobal(
    'matchMedia',
    (consulta: string) =>
      ({
        matches: false,
        media: consulta,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('folha montada no layout autenticado', () => {
  it.each(['/', '/lancamentos', '/ajustes'])('em %s a folha está no DOM e oculta', async (rota) => {
    navegar(rota);

    const f = await esperarFolhaMontada();
    expect(f).toHaveAttribute('hidden');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a folha é montada uma vez só', async () => {
    navegar('/');

    await esperarFolhaMontada();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(document.querySelectorAll('#valor')).toHaveLength(1);
  });
});

describe('o "+" mostra a folha e foca o valor no mesmo handler', () => {
  it('pela barra inferior: visível e foco no #valor logo após o clique', async () => {
    const { router } = navegar('/');
    await esperarFolhaMontada();
    const { daBarra } = await botoesLancar();

    fireEvent.click(daBarra);

    expect(folha()).not.toHaveAttribute('hidden');
    expect(document.activeElement).toBe(document.getElementById('valor'));
    expect(router.state.location.pathname).toBe('/');
  });

  it('pelo trilho: visível e foco no #valor logo após o clique', async () => {
    const { router } = navegar('/lancamentos');
    await esperarFolhaMontada();
    const { doTrilho } = await botoesLancar();

    fireEvent.click(doTrilho);

    expect(folha()).not.toHaveAttribute('hidden');
    expect(document.activeElement).toBe(document.getElementById('valor'));
    expect(router.state.location.pathname).toBe('/lancamentos');
  });

  it('Fechar fora de /lancar só oculta, sem navegar', async () => {
    const user = userEvent.setup();
    const { router } = navegar('/lancamentos');
    await esperarFolhaMontada();
    const { daBarra } = await botoesLancar();
    fireEvent.click(daBarra);

    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(folha()).toHaveAttribute('hidden');
    expect(router.state.location.pathname).toBe('/lancamentos');
  });
});

describe('rota /lancar', () => {
  it('abre a folha ao entrar', async () => {
    navegar('/lancar');

    expect(await screen.findByRole('dialog', { name: 'Lançar' })).toBeVisible();
  });

  it('Fechar em /lancar volta para /', async () => {
    const user = userEvent.setup();
    const { router } = navegar('/lancar');
    await screen.findByRole('dialog', { name: 'Lançar' });

    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(folha()).toHaveAttribute('hidden');
  });
});

describe('fora da sessão', () => {
  it('nada da folha é montado nem buscado', async () => {
    sessao.definir(null);
    const { router } = navegar('/');

    await waitFor(() => expect(router.state.location.pathname).toBe('/entrar'));
    expect(folha()).toBeNull();
    expect(buscarDadosLancamento).not.toHaveBeenCalled();
  });

  it('um valor digitado não sobrevive à saída da sessão', async () => {
    const user = userEvent.setup();
    navegar('/');
    await esperarFolhaMontada();
    const { daBarra } = await botoesLancar();
    fireEvent.click(daBarra);
    await user.keyboard('4590');
    expect(document.getElementById('valor')).toHaveValue('R$ 45,90');

    act(() => sessao.definir(null));
    await waitFor(() => expect(folha()).toBeNull());
    act(() => sessao.definir(sessao.falsa));

    await esperarFolhaMontada();
    expect(document.getElementById('valor')).toHaveValue('R$ 0,00');
  });
});

describe('página de ensaio removida', () => {
  it('/ensaio-teclado cai na página não encontrada', async () => {
    navegar('/ensaio-teclado');

    expect(await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument();
  });
});
