import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { mapaRotas } from './mapaRotas';
import { useSessao } from './ganchos/useSessao';
import { useContexto } from './ganchos/useContexto';

vi.mock('./ganchos/useSessao', () => ({ useSessao: vi.fn() }));
vi.mock('./ganchos/useContexto', () => ({ useContexto: vi.fn() }));
vi.mock('./ganchos/useInicializarMembro', () => ({ useInicializarMembro: vi.fn() }));
vi.mock('./ganchos/usePendentes', () => ({ usePendentes: () => ({ itens: [], total: 0, aguardando: 0, falhas: 0 }) }));
vi.mock('./dados/consultas/resumoMes', () => ({ buscarResumoMes: () => new Promise(() => {}) }));

const sessaoFalsa = { user: { id: 'u1' }, access_token: 'token-falso' };

function comSessao() {
  vi.mocked(useSessao).mockReturnValue({ carregando: false, sessao: sessaoFalsa } as never);
}
function semSessao() {
  vi.mocked(useSessao).mockReturnValue({ carregando: false, sessao: null } as never);
}
function carregandoSessao() {
  vi.mocked(useSessao).mockReturnValue({ carregando: true, sessao: null } as never);
}

function navegar(rota: string) {
  const router = createMemoryRouter(mapaRotas, { initialEntries: [rota] });
  const resultado = render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, ...resultado };
}

beforeEach(() => {
  vi.mocked(useContexto).mockReturnValue({
    data: { mes_corrente: '2026-10-01' },
    isPending: false,
    isError: false,
  } as never);
  document.title = '';
});

describe('guarda da área autenticada', () => {
  it.each(['/', '/metas/1', '/rota-que-nao-existe'])('sem sessão em %s vai para /entrar', async (rota) => {
    semSessao();
    const { router } = navegar(rota);
    await waitFor(() => expect(router.state.location.pathname).toBe('/entrar'));
  });

  it('com sessão em /entrar vai para /', async () => {
    comSessao();
    const { router } = navegar('/entrar');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it.each([
    ['com sessão', comSessao],
    ['sem sessão', semSessao],
  ])('/redefinir-senha fica onde está %s', async (_nome, preparar) => {
    preparar();
    const { router } = navegar('/redefinir-senha');
    await waitFor(() => expect(router.state.navigation.state).toBe('idle'));
    await new Promise((r) => setTimeout(r, 0));
    expect(router.state.location.pathname).toBe('/redefinir-senha');
  });

  it('com a sessão carregando não redireciona nem mostra o conteúdo', async () => {
    carregandoSessao();
    const { router, container } = navegar('/metas');
    await new Promise((r) => setTimeout(r, 0));
    expect(router.state.location.pathname).toBe('/metas');
    expect(container.querySelector('nav')).toBeNull();
    expect(screen.queryByRole('main')).toBeNull();
  });

  it('com sessão numa rota desconhecida mostra a página não encontrada', async () => {
    comSessao();
    const { router } = navegar('/xyz');
    expect(await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/xyz');
    expect(within(screen.getByRole('main')).getByRole('link', { name: /início/i })).toHaveAttribute('href', '/');
    await waitFor(() => expect(document.title).toBe('Página não encontrada · MyMoney'));
  });
});

describe('layout autenticado', () => {
  it('tem a barra, o trilho e o .conteudo', async () => {
    comSessao();
    const { container } = navegar('/');
    await waitFor(() => expect(screen.getAllByRole('navigation', { name: 'Navegação principal' })).toHaveLength(2));
    const conteudo = container.querySelector('[class*="conteudo"]');
    expect(conteudo).not.toBeNull();
    expect(container.querySelector('[class*="app"]')).not.toBeNull();
  });

  it('segue a ordem do DOM do mockup: trilho, conteúdo, barra', async () => {
    comSessao();
    const { container } = navegar('/');
    await waitFor(() => expect(screen.getAllByRole('navigation')).toHaveLength(2));
    const [trilho, barra] = screen.getAllByRole('navigation');
    const conteudo = container.querySelector('[class*="conteudo"]') as Element;
    expect(trilho.compareDocumentPosition(conteudo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(conteudo.compareDocumentPosition(barra) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(trilho).queryByRole('link', { name: 'Ajustes' })).not.toBeNull();
  });

  it('rota estreita aplica a classe conteudo-estreito', async () => {
    comSessao();
    const { container } = navegar('/ajustes');
    await waitFor(() => expect(container.querySelector('[class*="conteudo-estreito"]')).not.toBeNull());
  });

  it('o Início não usa conteudo-estreito', async () => {
    comSessao();
    const { container } = navegar('/');
    await waitFor(() => expect(screen.getAllByRole('navigation')).toHaveLength(2));
    expect(container.querySelector('[class*="conteudo-estreito"]')).toBeNull();
  });
});

describe('título da página', () => {
  it('/?mes=2026-10 → "Início · Outubro de 2026 · MyMoney"', async () => {
    comSessao();
    navegar('/?mes=2026-10');
    await waitFor(() => expect(document.title).toBe('Início · Outubro de 2026 · MyMoney'));
  });

  it('/ sem mes usa o mes_corrente do contexto', async () => {
    comSessao();
    vi.mocked(useContexto).mockReturnValue({
      data: { mes_corrente: '2026-09-01' },
      isPending: false,
      isError: false,
    } as never);
    navegar('/');
    await waitFor(() => expect(document.title).toBe('Início · Setembro de 2026 · MyMoney'));
  });

  it('/ajustes → "Ajustes · MyMoney"', async () => {
    comSessao();
    navegar('/ajustes');
    await waitFor(() => expect(document.title).toBe('Ajustes · MyMoney'));
  });

  it('/entrar → "Entrar · MyMoney"', async () => {
    semSessao();
    navegar('/entrar');
    await waitFor(() => expect(document.title).toBe('Entrar · MyMoney'));
  });

  it('/redefinir-senha não leva o token do link para o título', async () => {
    semSessao();
    navegar('/redefinir-senha#access_token=segredo&type=recovery');
    await waitFor(() => expect(document.title).toMatch(/· MyMoney$/));
    expect(document.title).not.toContain('segredo');
  });
});
