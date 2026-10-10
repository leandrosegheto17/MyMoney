import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  desfazerPagamento,
  encerrarDespesaFixa,
  pagarOcorrencia,
  salvarDespesaFixa,
} from '../dados/comandos/despesasFixas';
import { useComandosFixas } from './useComandosFixas';

vi.mock('../dados/comandos/despesasFixas', () => ({
  salvarDespesaFixa: vi.fn(),
  encerrarDespesaFixa: vi.fn(),
  pagarOcorrencia: vi.fn(),
  desfazerPagamento: vi.fn(),
}));

type Chave = readonly unknown[];

function criarAmbiente() {
  const clienteConsulta = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const espiaInvalidar = vi.spyOn(clienteConsulta, 'invalidateQueries');
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={clienteConsulta}>{children}</QueryClientProvider>
  );
  const chavesInvalidadas = (): Chave[] =>
    espiaInvalidar.mock.calls.map(([filtro]) => (filtro as { queryKey?: Chave } | undefined)?.queryKey ?? []);
  return { envoltorio, espiaInvalidar, chavesInvalidadas };
}

// O comando da fábrica pode ser a função ou o resultado do useMutation.
function executar(comando: unknown, argumentos: unknown): Promise<unknown> {
  if (typeof comando === 'function') return (comando as (a: unknown) => Promise<unknown>)(argumentos);
  return (comando as { mutateAsync: (a: unknown) => Promise<unknown> }).mutateAsync(argumentos);
}

const ID_ALUGUEL = '00000000-0000-4000-8000-000000000701';
const ID_OCORRENCIA = '00000000-0000-4000-8000-000000000806';
const ID_PIX = '00000000-0000-4000-8000-000000000301';
const DADOS_SALVAR = {
  id: ID_ALUGUEL,
  descricao: 'Aluguel',
  categoriaId: '00000000-0000-4000-8000-000000000403',
  valorPrevistoCentavos: 120000,
  diaVencimento: 10,
};

function comInicio(chaves: Chave[], prefixo: string) {
  return chaves.some((chave) => chave[0] === prefixo);
}

afterEach(() => {
  vi.mocked(salvarDespesaFixa).mockReset();
  vi.mocked(encerrarDespesaFixa).mockReset();
  vi.mocked(pagarOcorrencia).mockReset();
  vi.mocked(desfazerPagamento).mockReset();
  onlineManager.setOnline(true);
});

describe('useComandosFixas: salvar e encerrar', () => {
  it('salvar invalida despesas_fixas, ocorrencias_mes e resumo_mes', async () => {
    vi.mocked(salvarDespesaFixa).mockResolvedValue(ID_ALUGUEL as never);
    const { envoltorio, chavesInvalidadas } = criarAmbiente();
    const { result } = renderHook(() => useComandosFixas(), { wrapper: envoltorio });

    await act(() => executar(result.current.salvarDespesaFixa, DADOS_SALVAR));

    expect(salvarDespesaFixa).toHaveBeenCalledWith(DADOS_SALVAR);
    const chaves = chavesInvalidadas();
    expect(chaves).toEqual(expect.arrayContaining([['despesas_fixas'], ['ocorrencias_mes']]));
    expect(comInicio(chaves, 'resumo_mes')).toBe(true);
  });

  it('encerrar invalida despesas_fixas, ocorrencias_mes e resumo_mes', async () => {
    vi.mocked(encerrarDespesaFixa).mockResolvedValue(undefined as never);
    const { envoltorio, chavesInvalidadas } = criarAmbiente();
    const { result } = renderHook(() => useComandosFixas(), { wrapper: envoltorio });

    await act(() => executar(result.current.encerrarDespesaFixa, ID_ALUGUEL));

    expect(encerrarDespesaFixa).toHaveBeenCalledWith(ID_ALUGUEL);
    const chaves = chavesInvalidadas();
    expect(chaves).toEqual(expect.arrayContaining([['despesas_fixas'], ['ocorrencias_mes']]));
    expect(comInicio(chaves, 'resumo_mes')).toBe(true);
  });
});

describe('useComandosFixas: pagar e desfazer', () => {
  const CINCO = ['ocorrencias_mes', 'resumo_mes', 'lancamentos_mes', 'contas', 'formas_pagamento'];

  it('pagar invalida ocorrências, resumo, lançamentos, contas e formas', async () => {
    vi.mocked(pagarOcorrencia).mockResolvedValue({} as never);
    const { envoltorio, chavesInvalidadas } = criarAmbiente();
    const { result } = renderHook(() => useComandosFixas(), { wrapper: envoltorio });
    const argumentos = { ocorrenciaId: ID_OCORRENCIA, formaId: ID_PIX };

    await act(() => executar(result.current.pagarOcorrencia, argumentos));

    expect(pagarOcorrencia).toHaveBeenCalledWith(argumentos);
    const chaves = chavesInvalidadas();
    for (const prefixo of CINCO) expect(comInicio(chaves, prefixo)).toBe(true);
  });

  it('desfazer invalida ocorrências, resumo, lançamentos, contas e formas', async () => {
    vi.mocked(desfazerPagamento).mockResolvedValue(undefined as never);
    const { envoltorio, chavesInvalidadas } = criarAmbiente();
    const { result } = renderHook(() => useComandosFixas(), { wrapper: envoltorio });

    await act(() => executar(result.current.desfazerPagamento, ID_OCORRENCIA));

    expect(desfazerPagamento).toHaveBeenCalledWith(ID_OCORRENCIA);
    const chaves = chavesInvalidadas();
    for (const prefixo of CINCO) expect(comInicio(chaves, prefixo)).toBe(true);
  });
});

describe('useComandosFixas: erro', () => {
  it('erro não invalida nada e sobe como ErroDados', async () => {
    vi.mocked(desfazerPagamento).mockRejectedValue({ tipo: 'regra', codigo: 'registro_invalido' });
    const { envoltorio, espiaInvalidar } = criarAmbiente();
    const { result } = renderHook(() => useComandosFixas(), { wrapper: envoltorio });

    await act(async () => {
      await expect(executar(result.current.desfazerPagamento, ID_OCORRENCIA)).rejects.toEqual({
        tipo: 'regra',
        codigo: 'registro_invalido',
      });
    });

    expect(espiaInvalidar).not.toHaveBeenCalled();
  });

  it('sem rede a mutação não fica pausada: chama o comando e devolve rede', async () => {
    onlineManager.setOnline(false);
    vi.mocked(pagarOcorrencia).mockRejectedValue({ tipo: 'rede' });
    const { envoltorio, espiaInvalidar } = criarAmbiente();
    const { result } = renderHook(() => useComandosFixas(), { wrapper: envoltorio });

    let promessa: Promise<unknown> | undefined;
    act(() => {
      promessa = executar(result.current.pagarOcorrencia, { ocorrenciaId: ID_OCORRENCIA, formaId: ID_PIX });
      promessa.catch(() => {});
    });

    await waitFor(() => expect(pagarOcorrencia).toHaveBeenCalledTimes(1));
    await expect(promessa).rejects.toEqual({ tipo: 'rede' });
    expect(espiaInvalidar).not.toHaveBeenCalled();
  });
});
