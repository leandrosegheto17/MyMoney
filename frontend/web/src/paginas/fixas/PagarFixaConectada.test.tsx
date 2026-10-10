import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DespesasFixas } from '../DespesasFixas';
import { useComandosFixas } from '../../ganchos/useComandosFixas';
import { useContexto } from '../../ganchos/useContexto';
import { useDadosLancamento } from '../../ganchos/useDadosLancamento';
import { useDespesasFixas } from '../../ganchos/useDespesasFixas';
import { useOcorrenciasMes } from '../../ganchos/useOcorrenciasMes';

const { mostrarAviso } = vi.hoisted(() => ({ mostrarAviso: vi.fn() }));

vi.mock('../../ganchos/useOcorrenciasMes', () => ({ useOcorrenciasMes: vi.fn() }));
vi.mock('../../ganchos/useDespesasFixas', () => ({ useDespesasFixas: vi.fn(), useDespesaFixa: vi.fn() }));
vi.mock('../../ganchos/useComandosFixas', () => ({ useComandosFixas: vi.fn() }));
vi.mock('../../ganchos/useDadosLancamento', () => ({ useDadosLancamento: vi.fn() }));
vi.mock('../../ganchos/useContexto', () => ({ useContexto: vi.fn() }));
vi.mock('../../componentes/base/useAviso', () => ({ useAviso: () => ({ mostrar: mostrarAviso }) }));

const RESPOSTAS = new URL('../../../../../.md/mockup/respostas/', import.meta.url);

function resposta<T = unknown>(nome: string): T {
  return JSON.parse(readFileSync(new URL(`${nome}.json`, RESPOSTAS), 'utf8'));
}

function consultaPronta<T>(data: T) {
  return {
    data,
    error: null,
    status: 'success',
    fetchStatus: 'idle',
    isPending: false,
    isLoading: false,
    isSuccess: true,
    isError: false,
    isFetching: false,
    dataUpdatedAt: Date.now(),
    refetch: vi.fn(),
  };
}

// Serve tanto a quem chama a função quanto a quem usa mutate/mutateAsync.
function comandoSimulado() {
  const comando = vi.fn();
  Object.assign(comando, {
    mutateAsync: comando,
    mutate: (argumentos: unknown, opcoes?: { onSuccess?: (r: unknown) => void; onError?: (e: unknown) => void; onSettled?: () => void }) => {
      Promise.resolve()
        .then(() => comando(argumentos))
        .then(
          (r) => opcoes?.onSuccess?.(r),
          (e) => opcoes?.onError?.(e),
        )
        .finally(() => opcoes?.onSettled?.());
    },
    isPending: false,
    reset: vi.fn(),
  });
  return comando;
}

function Local() {
  const local = useLocation();
  return <output data-testid="local">{`${local.pathname}${local.search}`}</output>;
}

function renderizarPagina(caminho: string) {
  const clienteConsulta = new QueryClient();
  const espiaInvalidar = vi.spyOn(clienteConsulta, 'invalidateQueries');
  render(
    <QueryClientProvider client={clienteConsulta}>
      <MemoryRouter initialEntries={[caminho]}>
        <Routes>
          <Route
            path="/fixas"
            element={
              <>
                <DespesasFixas />
                <Local />
              </>
            }
          />
          <Route path="*" element={<Local />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { espiaInvalidar };
}

const ID_INTERNET = '00000000-0000-4000-8000-000000000804';
const ID_AGUA_PAGA = '00000000-0000-4000-8000-000000000806';
const ID_PIX = '00000000-0000-4000-8000-000000000301';
const ID_DEBITO = '00000000-0000-4000-8000-000000000302';
const CAMINHO_INTERNET = `/fixas?mes=2026-10&pagar=${ID_INTERNET}`;
const NOTA_CREDITO =
  'Se pagar no cartão de crédito: conta em outubro na casa e aparece no cartão no próximo vencimento.';
const SEM_CONEXAO =
  'Sem conexão. O pagamento não foi registrado. Seus dados continuam aqui: tente de novo quando a rede voltar.';

const valorDe = (campo: HTMLElement) => (campo as HTMLInputElement).value;

let comandos: Record<string, ReturnType<typeof comandoSimulado>>;

function usarDadosLancamento(nome: string) {
  vi.mocked(useDadosLancamento).mockReturnValue(
    consultaPronta({ dados: resposta(nome), doAparelho: false, salvoEm: Date.now() }) as never,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-09T15:00:00Z'));
  comandos = {
    salvarDespesaFixa: comandoSimulado(),
    encerrarDespesaFixa: comandoSimulado(),
    pagarOcorrencia: comandoSimulado(),
    desfazerPagamento: comandoSimulado(),
  };
  vi.mocked(useComandosFixas).mockReturnValue(comandos as never);
  vi.mocked(useOcorrenciasMes).mockReturnValue(consultaPronta(resposta('ocorrencias-mes')) as never);
  vi.mocked(useDespesasFixas).mockReturnValue(consultaPronta(resposta('despesas-fixas')) as never);
  vi.mocked(useContexto).mockReturnValue(consultaPronta(resposta('contexto')) as never);
  usarDadosLancamento('dados-lancamento');
});

afterEach(() => {
  vi.useRealTimers();
  mostrarAviso.mockReset();
});

function folha() {
  return screen.getByRole('dialog', { name: 'Marcar como paga' });
}

async function escolherForma(usuario: ReturnType<typeof userEvent.setup>, nome: string) {
  await usuario.click(within(folha()).getByRole('button', { name: /Forma de pagamento/ }));
  await usuario.click(within(folha()).getByText(nome));
}

describe('Folha "Marcar como paga": abertura e padrões', () => {
  it('abre para a ocorrência do ?pagar= com forma, valor, data e nota padrão', () => {
    renderizarPagina(CAMINHO_INTERNET);

    const dialogo = folha();
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveTextContent('Internet');
    expect(dialogo).toHaveTextContent('Contas da casa · venceu 05/10');
    expect(within(dialogo).getByRole('button', { name: /Forma de pagamento\s*Pix Nubank\s*· Pix/ })).toBeInTheDocument();
    expect(
      within(dialogo).getByText('Só você vê a forma e a conta. O outro membro vê "Paga por Leandro".'),
    ).toBeInTheDocument();
    expect(valorDe(within(dialogo).getByLabelText('Valor pago'))).toMatch(/^R\$\s119,90$/);
    expect(within(dialogo).getByText(/^Previsto: R\$\s119,90$/)).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Data do pagamento')).toHaveValue('2026-10-09');
    expect(within(dialogo).getByText(NOTA_CREDITO)).toBeInTheDocument();
    expect(within(dialogo).getByRole('button', { name: 'Confirmar pagamento' })).toBeInTheDocument();
  });

  it('trocar para o cartão de crédito mantém a nota', async () => {
    const usuario = userEvent.setup();
    renderizarPagina(CAMINHO_INTERNET);

    await escolherForma(usuario, 'Cartão de crédito XP');

    expect(within(folha()).getByRole('button', { name: /Forma de pagamento\s*Cartão de crédito XP\s*· Crédito/ })).toBeInTheDocument();
    expect(within(folha()).getByText(NOTA_CREDITO)).toBeInTheDocument();
  });

  it.each([
    ['ocorrência já paga', ID_AGUA_PAGA],
    ['id estranho', 'xyz'],
  ])('%s: não abre e tira o parâmetro', async (_caso, id) => {
    renderizarPagina(`/fixas?mes=2026-10&pagar=${id}`);

    await waitFor(() => expect(screen.getByTestId('local')).not.toHaveTextContent('pagar='));
    expect(screen.getByTestId('local')).toHaveTextContent('mes=2026-10');
    expect(screen.queryByRole('dialog', { name: 'Marcar como paga' })).not.toBeInTheDocument();
  });

  it('fechar pelo X tira o parâmetro', async () => {
    const usuario = userEvent.setup();
    renderizarPagina(CAMINHO_INTERNET);

    await usuario.click(within(folha()).getByRole('button', { name: 'Fechar' }));

    expect(screen.queryByRole('dialog', { name: 'Marcar como paga' })).not.toBeInTheDocument();
    expect(screen.getByTestId('local')).not.toHaveTextContent('pagar=');
  });
});

describe('Folha "Marcar como paga": confirmar', () => {
  it('envia ocorrência, forma, valor e data; sucesso avisa e tira o parâmetro', async () => {
    comandos.pagarOcorrencia.mockResolvedValue({});
    const usuario = userEvent.setup();
    renderizarPagina(CAMINHO_INTERNET);

    await usuario.click(within(folha()).getByRole('button', { name: 'Confirmar pagamento' }));

    await waitFor(() => expect(comandos.pagarOcorrencia).toHaveBeenCalledTimes(1));
    expect(comandos.pagarOcorrencia.mock.calls[0][0]).toMatchObject({
      ocorrenciaId: ID_INTERNET,
      formaId: ID_PIX,
      valorCentavos: 11990,
      data: '2026-10-09',
    });
    await waitFor(() => expect(mostrarAviso).toHaveBeenCalledWith('sucesso', 'Marcada como paga'));
    await waitFor(() => expect(screen.getByTestId('local')).not.toHaveTextContent('pagar='));
    expect(screen.queryByRole('dialog', { name: 'Marcar como paga' })).not.toBeInTheDocument();
  });

  it('sem rede: aviso de topo, forma e valor editado mantidos, "Tentar de novo" reenvia', async () => {
    comandos.pagarOcorrencia.mockRejectedValueOnce({ tipo: 'rede' }).mockResolvedValueOnce({});
    const usuario = userEvent.setup();
    renderizarPagina(CAMINHO_INTERNET);

    await escolherForma(usuario, 'Débito Itaú');
    const valor = within(folha()).getByLabelText('Valor pago');
    await usuario.clear(valor);
    await usuario.type(valor, '12490');
    await usuario.click(within(folha()).getByRole('button', { name: 'Confirmar pagamento' }));

    const alerta = await within(folha()).findByRole('alert');
    expect(alerta).toHaveTextContent(SEM_CONEXAO);
    expect(valorDe(within(folha()).getByLabelText('Valor pago'))).toMatch(/^R\$\s124,90$/);
    expect(within(folha()).getByRole('button', { name: /Forma de pagamento\s*Débito Itaú/ })).toBeInTheDocument();
    expect(screen.getByTestId('local')).toHaveTextContent(`pagar=${ID_INTERNET}`);

    await usuario.click(within(folha()).getByRole('button', { name: 'Tentar de novo' }));

    await waitFor(() => expect(comandos.pagarOcorrencia).toHaveBeenCalledTimes(2));
    const esperado = { ocorrenciaId: ID_INTERNET, formaId: ID_DEBITO, valorCentavos: 12490, data: '2026-10-09' };
    expect(comandos.pagarOcorrencia.mock.calls[0][0]).toMatchObject(esperado);
    expect(comandos.pagarOcorrencia.mock.calls[1][0]).toMatchObject(esperado);
    await waitFor(() => expect(mostrarAviso).toHaveBeenCalledWith('sucesso', 'Marcada como paga'));
  });

  it('recusa de regra (já paga pelo outro) mostra o aviso de topo e invalida ocorrencias_mes', async () => {
    comandos.pagarOcorrencia.mockRejectedValue({ tipo: 'regra', codigo: 'registro_invalido' });
    const usuario = userEvent.setup();
    const { espiaInvalidar } = renderizarPagina(CAMINHO_INTERNET);

    await usuario.click(within(folha()).getByRole('button', { name: 'Confirmar pagamento' }));

    expect(await within(folha()).findByRole('alert')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        espiaInvalidar.mock.calls.some(
          ([filtro]) => (filtro as { queryKey?: readonly unknown[] } | undefined)?.queryKey?.[0] === 'ocorrencias_mes',
        ),
      ).toBe(true),
    );
  });
});

describe('Folha "Marcar como paga": sem forma de pagamento', () => {
  it('mostra o atalho "Cadastrar forma" e não mostra o rodapé', () => {
    usarDadosLancamento('dados-lancamento-sem-formas');
    renderizarPagina(CAMINHO_INTERNET);

    const dialogo = folha();
    expect(
      within(dialogo).getByRole('heading', { level: 3, name: 'Você ainda não tem forma de pagamento' }),
    ).toBeInTheDocument();
    expect(
      within(dialogo).getByText('Cadastre uma forma (Pix, Débito ou cartão) para registrar quem pagou.'),
    ).toBeInTheDocument();
    expect(within(dialogo).getByRole('link', { name: 'Cadastrar forma' })).toHaveAttribute(
      'href',
      '/ajustes/formas/nova',
    );
    expect(within(dialogo).queryByRole('button', { name: 'Confirmar pagamento' })).not.toBeInTheDocument();
    expect(within(dialogo).queryByLabelText('Valor pago')).not.toBeInTheDocument();
  });
});
