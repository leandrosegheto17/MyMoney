import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DadosLancamento } from '@mymoney/contrato/respostas/dados-lancamento';
import { lerResposta } from '../../../test/apoio/fetchSimulado';

const { sessaoFalsa, buscarDadosLancamento, lancarDespesa } = vi.hoisted(() => ({
  sessaoFalsa: { user: { id: '00000000-0000-4000-8000-0000000000aa' }, access_token: 'token-falso' },
  buscarDadosLancamento: vi.fn(),
  lancarDespesa: vi.fn(),
}));

vi.mock('../../ganchos/useSessao', () => ({
  useSessao: () => ({ carregando: false, sessao: sessaoFalsa }),
}));

vi.mock('../../dados/sessao', () => ({
  obterSessao: vi.fn(async () => sessaoFalsa),
  ouvirSessao: vi.fn((cb: (s: unknown) => void) => {
    cb(sessaoFalsa);
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
  enviarAgora: vi.fn(async () => {}),
}));

vi.mock('../../dados/comandos/lancarDespesa', () => ({ lancarDespesa }));

const dados = lerResposta<DadosLancamento>('dados-lancamento.json');
const semFormas = lerResposta<DadosLancamento>('dados-lancamento-sem-formas.json');
const credito = lerResposta<Record<string, unknown>>('lancar-despesa-credito.json');
const respostaPix = { ...credito, valor_total_centavos: 4590, num_parcelas: 1, primeira_parcela_data: '2026-10-09' };

async function navegar(rota = '/lancar') {
  vi.resetModules();
  globalThis.indexedDB = new IDBFactory();
  const { mapaRotas } = await import('../../mapaRotas');
  const clienteConsulta = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(mapaRotas, { initialEntries: [rota] });
  render(
    <QueryClientProvider client={clienteConsulta}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

async function abrirFolha(com: DadosLancamento = dados) {
  buscarDadosLancamento.mockResolvedValue({ dados: com, doAparelho: false, salvoEm: Date.now() });
  const user = userEvent.setup();
  await navegar();
  const folha = await screen.findByRole('dialog', { name: 'Lançar' });
  return { user, folha };
}

function valor() {
  return document.getElementById('valor') as HTMLInputElement;
}

function botaoLancar() {
  return screen.getByRole('button', { name: /^Lançar/ });
}

async function preencher(user: ReturnType<typeof userEvent.setup>, folha: HTMLElement) {
  await within(folha).findByRole('radio', { name: /^Mercado/ });
  await user.click(valor());
  await user.keyboard('4590');
  await user.click(within(folha).getByRole('radio', { name: /^Mercado/ }));
}

async function trocarFormaPara(user: ReturnType<typeof userEvent.setup>, folha: HTMLElement, nome: RegExp) {
  await user.click(within(folha).getByRole('button', { name: /^Forma de pagamento/ }));
  const radios = within(folha)
    .queryAllByRole('radio')
    .filter((r) => r.getAttribute('name') !== 'categoria' && r.getAttribute('name') !== 'tipo');
  const lista = radios.length > 0 ? radios : within(folha).getAllByRole('option');
  const alvo = lista.find((o) => nome.test(o.closest('label')?.textContent ?? o.textContent ?? ''));
  await user.click(alvo as HTMLElement);
}

beforeEach(() => {
  lancarDespesa.mockReset();
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
});

describe('botão "Lançar"', () => {
  it('fica habilitado com valor 0', async () => {
    await abrirFolha();

    expect(botaoLancar()).toBeEnabled();
    expect(botaoLancar()).not.toHaveAttribute('aria-disabled', 'true');
    expect(botaoLancar()).toHaveAccessibleName('Lançar');
  });

  it('o nome acompanha o valor: "Lançar R$ 45,90"', async () => {
    const { user } = await abrirFolha();

    await user.click(valor());
    await user.keyboard('4590');

    expect(botaoLancar()).toHaveAccessibleName('Lançar R$ 45,90');
  });
});

describe('validação no envio', () => {
  it('envio vazio mostra os 2 erros, anuncia o do valor e foca o valor', async () => {
    const { user, folha } = await abrirFolha();
    await within(folha).findByRole('radiogroup', { name: 'Categoria' });

    await user.click(botaoLancar());

    const alerta = within(folha).getByRole('alert');
    expect(alerta).toHaveTextContent('Informe um valor maior que zero.');
    expect(valor()).toHaveAttribute('aria-invalid', 'true');
    expect(within(folha).getByText('Escolha uma categoria.')).toBeInTheDocument();
    expect(within(folha).getByRole('radiogroup', { name: 'Categoria' })).toHaveAccessibleDescription(
      'Escolha uma categoria.',
    );
    expect(document.activeElement).toBe(valor());
    expect(lancarDespesa).not.toHaveBeenCalled();
  });
});

describe('depois do envio', () => {
  it('sucesso: aviso, limpa valor e categoria, mantém a forma e foca o valor', async () => {
    lancarDespesa.mockResolvedValue(respostaPix as never);
    const { user, folha } = await abrirFolha();
    await preencher(user, folha);
    await trocarFormaPara(user, folha, /Débito Itaú/);

    await user.click(botaoLancar());

    const aviso = await screen.findByText('Lançado: R$ 45,90 · Mercado · Casa');
    expect(aviso.closest('[role="status"]')).not.toBeNull();
    expect(valor()).toHaveValue('R$ 0,00');
    const categorias = within(folha)
      .getAllByRole('radio')
      .filter((r) => r.getAttribute('name') === 'categoria') as HTMLInputElement[];
    expect(categorias.length).toBeGreaterThan(0);
    expect(categorias.filter((r) => r.checked)).toHaveLength(0);
    expect(within(folha).getByRole('button', { name: /^Forma de pagamento/ })).toHaveAccessibleName(
      'Forma de pagamento Débito Itaú · Débito',
    );
    expect(document.activeElement).toBe(valor());
    expect(screen.getByRole('dialog', { name: 'Lançar' })).toBeVisible();
  });

  it('sem rede: "Guardado no aparelho…" e o formulário limpo', async () => {
    lancarDespesa.mockRejectedValue({ tipo: 'rede' });
    const { user, folha } = await abrirFolha();
    await preencher(user, folha);

    await user.click(botaoLancar());

    expect(await screen.findByText('Guardado no aparelho. Será enviado quando houver conexão.')).toBeInTheDocument();
    expect(valor()).toHaveValue('R$ 0,00');
    expect(document.activeElement).toBe(valor());
  });

  it('durante a espera: "Lançando…", aria-busy e, após 3 s, guardado', async () => {
    lancarDespesa.mockImplementation(() => new Promise(() => {}));
    const { user, folha } = await abrirFolha();
    await preencher(user, folha);

    await user.click(botaoLancar());

    expect(await within(folha).findByRole('button', { name: /Lançando…/ })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('dialog', { name: 'Lançar' })).toHaveAttribute('aria-busy', 'true');
    await user.click(within(folha).getByRole('button', { name: /Lançando…/ }));
    expect(lancarDespesa).toHaveBeenCalledTimes(1);

    expect(
      await screen.findByText('Guardado no aparelho. Será enviado quando houver conexão.', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  }, 10_000);

  it('erro de regra: aviso no topo da folha e os dados ficam', async () => {
    lancarDespesa.mockRejectedValue({ tipo: 'regra', codigo: 'registro_invalido' });
    const { user, folha } = await abrirFolha();
    await preencher(user, folha);

    await user.click(botaoLancar());

    const alerta = await within(folha).findByRole('alert');
    expect(alerta.textContent?.trim().length).toBeGreaterThan(0);
    expect(alerta).not.toHaveTextContent('registro_invalido');
    expect(valor()).toHaveValue('R$ 45,90');
    expect(within(folha).getByRole('radio', { name: /^Mercado/ })).toBeChecked();
  });
});

describe('atalho no PC', () => {
  it.each([
    ['Ctrl + Enter', '{Control>}{Enter}{/Control}'],
    ['⌘ + Enter', '{Meta>}{Enter}{/Meta}'],
  ])('%s envia pelo mesmo caminho do botão', async (_nome, teclas) => {
    lancarDespesa.mockResolvedValue(respostaPix as never);
    const { user, folha } = await abrirFolha();
    await preencher(user, folha);
    valor().focus();

    await user.keyboard(teclas);

    await waitFor(() => expect(lancarDespesa).toHaveBeenCalledTimes(1));
  });
});

describe('sem conexão', () => {
  it('mostra a faixa offline no topo do corpo', async () => {
    const espiao = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      const { folha } = await abrirFolha();

      expect(
        await within(folha).findByText('Sem conexão. Os lançamentos de despesa ficam guardados no aparelho.'),
      ).toBeInTheDocument();
    } finally {
      espiao.mockRestore();
    }
  });
});

describe('estados vazios', () => {
  it('sem forma: "Cadastrar forma" e topo sem segmentado', async () => {
    const { folha } = await abrirFolha(semFormas);

    expect(
      await within(folha).findByRole('heading', { name: 'Cadastre uma forma de pagamento para lançar' }),
    ).toBeInTheDocument();
    expect(within(folha).getByRole('link', { name: 'Cadastrar forma' })).toHaveAttribute(
      'href',
      '/ajustes/formas/nova',
    );
    expect(within(folha).queryByRole('group', { name: 'Tipo de lançamento' })).not.toBeInTheDocument();
    expect(within(folha).queryByRole('button', { name: /^Lançar/ })).not.toBeInTheDocument();
  });

  it('sem categoria ativa: "Gerenciar categorias"', async () => {
    const { folha } = await abrirFolha({ ...dados, categorias_despesa: [] });

    expect(await within(folha).findByText('Nenhuma categoria ativa')).toBeInTheDocument();
    expect(within(folha).getByRole('link', { name: 'Gerenciar categorias' })).toHaveAttribute(
      'href',
      '/ajustes/categorias',
    );
  });
});
