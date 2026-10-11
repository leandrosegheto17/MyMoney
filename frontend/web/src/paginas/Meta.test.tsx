import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../dados/consultas/metas', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../dados/consultas/metas')>()),
  buscarMeta: vi.fn(),
  buscarMetas: vi.fn(),
}));
vi.mock('../dados/consultas/movimentosMeta', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../dados/consultas/movimentosMeta')>()),
  buscarMovimentosMeta: vi.fn(),
}));

import { buscarMeta } from '../dados/consultas/metas';
import { buscarMovimentosMeta } from '../dados/consultas/movimentosMeta';
import { Meta } from './Meta';

type Linha = Record<string, unknown>;

const ID_VIAGEM = '00000000-0000-4000-8000-000000000902';
const ID_CARRO = '00000000-0000-4000-8000-000000000905';

function lerResposta<T>(nome: string): T {
  return JSON.parse(
    readFileSync(new URL(`../../../../.md/mockup/respostas/${nome}.json`, import.meta.url), 'utf8'),
  ) as T;
}

function renderizar(id = ID_VIAGEM) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const roteador = createMemoryRouter([{ path: '/metas/:id', element: <Meta /> }], {
    initialEntries: [`/metas/${id}`],
  });
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
}

function prepararViagem(movimentos = lerResposta<Linha[]>('movimentos-meta')) {
  vi.mocked(buscarMeta).mockResolvedValue(lerResposta<Linha[]>('meta-detalhe')[0] as never);
  vi.mocked(buscarMovimentosMeta).mockResolvedValue(movimentos as never);
}

function prepararCarro() {
  vi.mocked(buscarMeta).mockResolvedValue(lerResposta<Linha[]>('meta-carro')[0] as never);
  vi.mocked(buscarMovimentosMeta).mockResolvedValue(lerResposta('movimentos-meta-vazio'));
}

function valorDaLinha(termo: string): string | null | undefined {
  return screen.getByText(termo, { selector: 'dt' }).nextElementSibling?.textContent;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('T11 Detalhe da meta: resumo', () => {
  it('título é o nome e o escopo aparece como selo', async () => {
    prepararViagem();
    renderizar();

    expect(await screen.findByRole('heading', { level: 1, name: 'Viagem Nordeste' })).toBeInTheDocument();
    expect(screen.getByText('Meta da casa')).toBeInTheDocument();
    expect(screen.getByText(/visível aos dois/)).toBeInTheDocument();
    expect(buscarMeta).toHaveBeenCalledWith(ID_VIAGEM);
  });

  it('"Faltam" mostra o valor, o percentual e a barra vindos da API', async () => {
    prepararViagem();
    renderizar();

    const resumo = await screen.findByRole('region', { name: 'Faltam' });
    expect(within(resumo).getByText('R$ 5.800,00')).toBeInTheDocument();
    expect(within(resumo).getByText('52%')).toBeInTheDocument();
    const barra = within(resumo).getByRole('progressbar', { name: 'Viagem Nordeste' });
    expect(barra).toHaveAttribute('aria-valuenow', '52');
    expect(barra.className).toMatch(/barra-casa/);
  });

  it('linhas de guardado, alvo, prazo e necessário por mês', async () => {
    prepararViagem();
    renderizar();

    await screen.findByRole('region', { name: 'Faltam' });
    expect(valorDaLinha('Guardado')).toBe('R$ 6.200,00');
    expect(valorDaLinha('Alvo')).toBe('R$ 12.000,00');
    expect(valorDaLinha('Prazo')).toBe('jul/2027');
    expect(valorDaLinha('Necessário por mês')).toBe('R$ 644,45');
  });

  it('sem prazo omite as linhas de prazo e de necessário por mês', async () => {
    const meta = { ...lerResposta<Linha[]>('meta-detalhe')[0], prazo: null, mensal_necessario_centavos: null };
    vi.mocked(buscarMeta).mockResolvedValue(meta as never);
    vi.mocked(buscarMovimentosMeta).mockResolvedValue(lerResposta('movimentos-meta'));
    renderizar();

    await screen.findByRole('region', { name: 'Faltam' });
    expect(screen.queryByText('Prazo', { selector: 'dt' })).not.toBeInTheDocument();
    expect(screen.queryByText('Necessário por mês', { selector: 'dt' })).not.toBeInTheDocument();
  });

  it('"Onde está guardado" lista os locais com o valor de cada um', async () => {
    prepararViagem();
    renderizar();

    const onde = await screen.findByRole('region', { name: 'Onde está guardado' });
    const itens = within(onde).getAllByRole('listitem');
    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveTextContent('Caixinha Nubank');
    expect(itens[0]).toHaveTextContent('R$ 4.200,00');
    expect(itens[1]).toHaveTextContent('CDB Banco Inter');
    expect(itens[1]).toHaveTextContent('R$ 2.000,00');
  });
});

describe('T11 Detalhe da meta: ações', () => {
  it('Aportar e Retirar abrem a folha pela URL; Editar leva ao formulário', async () => {
    prepararViagem();
    renderizar();

    const resumo = await screen.findByRole('region', { name: 'Faltam' });
    expect(within(resumo).getByRole('link', { name: 'Aportar' })).toHaveAttribute(
      'href',
      `/metas/${ID_VIAGEM}?movimentar=aporte`,
    );
    expect(within(resumo).getByRole('link', { name: 'Retirar' })).toHaveAttribute(
      'href',
      `/metas/${ID_VIAGEM}?movimentar=retirada`,
    );
    expect(screen.getByRole('link', { name: 'Editar meta' })).toHaveAttribute('href', `/metas/${ID_VIAGEM}/editar`);
  });
});

describe('T11 Detalhe da meta: histórico', () => {
  it('lista os 7 movimentos na ordem da API, com autor, data e local', async () => {
    prepararViagem();
    renderizar();

    const historico = await screen.findByRole('region', { name: 'Histórico' });
    const itens = within(historico).getAllByRole('listitem');
    expect(itens).toHaveLength(7);
    expect(itens[0]).toHaveTextContent('Aporte · Leandro');
    expect(itens[0]).toHaveTextContent('05/10/2026');
    expect(itens[0]).toHaveTextContent('Caixinha Nubank');
    expect(itens[1]).toHaveTextContent('Aporte · Ana');
    expect(itens[1]).toHaveTextContent('20/09/2026');
    expect(itens[1]).toHaveTextContent('CDB Banco Inter');
    expect(itens[5]).toHaveTextContent('Retirada · Ana');
    expect(itens[6]).toHaveTextContent('+ R$ 3.000,00');
    expect(
      within(historico).getByText('A conta de origem ou destino aparece só nos seus movimentos.'),
    ).toBeInTheDocument();
  });

  it('"da conta Nubank" só nas 4 linhas de Leandro; as de Ana não têm conta', async () => {
    prepararViagem();
    renderizar();

    const historico = await screen.findByRole('region', { name: 'Histórico' });
    const itens = within(historico).getAllByRole('listitem');
    const comConta = itens.filter((li) => /da conta Nubank/.test(li.textContent ?? ''));
    expect(comConta).toHaveLength(4);
    for (const li of comConta) expect(li).toHaveTextContent('Leandro');
    for (const li of itens.filter((l) => /Ana/.test(l.textContent ?? ''))) {
      expect(li).not.toHaveTextContent('da conta');
    }
  });

  it('aporte com "+" e cor de receita; retirada com "−" sem cor de receita', async () => {
    prepararViagem();
    renderizar();

    const historico = await screen.findByRole('region', { name: 'Histórico' });
    const retirada = within(historico).getByText('− R$ 300,00');
    expect(retirada.className).not.toMatch(/valor-receita/);
    const aporte = within(historico).getByText('+ R$ 3.000,00');
    expect(aporte.className).toMatch(/valor-receita/);
  });

  it('a tela só reflete a API: conta que vier numa linha de outro autor aparece', async () => {
    const movimentos = lerResposta<Linha[]>('movimentos-meta');
    movimentos[1] = { ...movimentos[1], conta: { nome: 'Conta da Ana' } };
    prepararViagem(movimentos);
    renderizar();

    const historico = await screen.findByRole('region', { name: 'Histórico' });
    expect(within(historico).getAllByRole('listitem')[1]).toHaveTextContent('da conta Conta da Ana');
  });
});

describe('T11 Detalhe da meta: vazio', () => {
  it('meta individual sem movimentos: "Minha meta", estado vazio com Aportar e sem Retirar', async () => {
    prepararCarro();
    renderizar(ID_CARRO);

    expect(await screen.findByRole('heading', { level: 1, name: 'Carro novo' })).toBeInTheDocument();
    expect(screen.getByText('Minha meta')).toBeInTheDocument();
    expect(screen.getByText(/só você vê/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Carro novo' }).className).toMatch(/barra-eu/);
    expect(await screen.findByRole('heading', { name: 'Nenhum aporte ainda' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Aportar' })).toHaveAttribute(
      'href',
      `/metas/${ID_CARRO}?movimentar=aporte`,
    );
    expect(screen.queryByRole('link', { name: 'Retirar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Onde está guardado' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Histórico' })).not.toBeInTheDocument();
  });

  it('sem movimentos a grade do resumo ocupa a largura toda', async () => {
    prepararCarro();
    renderizar(ID_CARRO);
    const resumo = await screen.findByRole('region', { name: 'Faltam' });
    expect(resumo.parentElement?.className).toMatch(/grade-cheia/);
  });

  it('com movimentos a grade segue em duas colunas', async () => {
    prepararViagem();
    renderizar();
    const resumo = await screen.findByRole('region', { name: 'Faltam' });
    expect(resumo.parentElement?.className).toMatch(/grade/);
    expect(resumo.parentElement?.className).not.toMatch(/grade-cheia/);
  });
});

describe('T11 Detalhe da meta: carregando e erro', () => {
  it('carregando: título "Meta", aviso para leitor de tela e sem "Editar meta"', async () => {
    vi.mocked(buscarMeta).mockReturnValue(new Promise(() => {}));
    vi.mocked(buscarMovimentosMeta).mockReturnValue(new Promise(() => {}));
    renderizar();

    expect(await screen.findByText('Carregando a meta…')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Meta' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Editar meta' })).not.toBeInTheDocument();
  });

  it('meta inexistente ou alheia mostra "Esta meta não existe mais"', async () => {
    vi.mocked(buscarMeta).mockRejectedValue({ tipo: 'regra', codigo: 'registro_invalido' });
    vi.mocked(buscarMovimentosMeta).mockRejectedValue({ tipo: 'regra', codigo: 'registro_invalido' });
    renderizar();

    const alerta = await screen.findByRole('alert');
    expect(within(alerta).getByRole('heading', { name: 'Esta meta não existe mais' })).toBeInTheDocument();
    expect(within(alerta).getByText('Ela pode ter sido excluída.')).toBeInTheDocument();
    expect(within(alerta).getByRole('link', { name: 'Voltar para Metas' })).toHaveAttribute('href', '/metas');
    expect(screen.getByRole('heading', { level: 1, name: 'Meta' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Editar meta' })).not.toBeInTheDocument();
  });

  it('erro de rede sem cache mostra o erro padrão', async () => {
    vi.mocked(buscarMeta).mockRejectedValue({ tipo: 'rede' });
    vi.mocked(buscarMovimentosMeta).mockRejectedValue({ tipo: 'rede' });
    renderizar();

    expect(await screen.findByRole('heading', { name: 'Não foi possível carregar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
    expect(screen.queryByText('Esta meta não existe mais')).not.toBeInTheDocument();
  });
});
