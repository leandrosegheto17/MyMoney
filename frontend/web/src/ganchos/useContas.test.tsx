import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComandosConta, useConta, useContas, usePreviaAjuste } from './useContas';

vi.mock('../dados/consultas/contas', () => ({
  buscarContas: vi.fn(),
  buscarConta: vi.fn(),
}));
vi.mock('../dados/comandos/contas', () => ({
  salvarConta: vi.fn(),
  arquivarConta: vi.fn(),
  excluirConta: vi.fn(),
  ajustarSaldo: vi.fn(),
}));

const consultas = await import('../dados/consultas/contas');
const comandos = await import('../dados/comandos/contas');

const lerResposta = (nome: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../.md/mockup/respostas/${nome}`, import.meta.url), 'utf8'));

const ID_NUBANK = '00000000-0000-4000-8000-000000000201';

function montar() {
  const clienteConsulta = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidar = vi.spyOn(clienteConsulta, 'invalidateQueries');
  const envolver = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={clienteConsulta}>{children}</QueryClientProvider>
  );
  return { clienteConsulta, invalidar, envolver };
}

const chavesInvalidadas = (invalidar: ReturnType<typeof montar>['invalidar']) =>
  invalidar.mock.calls.map(([filtro]) => (filtro as { queryKey?: unknown } | undefined)?.queryKey);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useContas e useConta', () => {
  it('useContas entrega a lista da consulta', async () => {
    vi.mocked(consultas.buscarContas).mockResolvedValue(lerResposta('contas.json') as never);
    const { envolver } = montar();

    const { result } = renderHook(() => useContas(), { wrapper: envolver });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(lerResposta('contas.json'));
  });

  it('useConta busca pelo id e entrega a linha', async () => {
    const [linha] = lerResposta('conta-nubank.json') as unknown[];
    vi.mocked(consultas.buscarConta).mockResolvedValue(linha as never);
    const { envolver } = montar();

    const { result } = renderHook(() => useConta(ID_NUBANK), { wrapper: envolver });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(consultas.buscarConta).toHaveBeenCalledWith(ID_NUBANK);
    expect(result.current.data).toEqual(linha);
  });

  it('erro da consulta é exposto como ErroDados', async () => {
    vi.mocked(consultas.buscarConta).mockRejectedValue({ tipo: 'regra', codigo: 'registro_invalido' });
    const { envolver } = montar();

    const { result } = renderHook(() => useConta(ID_NUBANK), { wrapper: envolver });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ tipo: 'regra', codigo: 'registro_invalido' });
  });
});

describe('useComandosConta', () => {
  const args = { p_id: ID_NUBANK, p_nome: 'Nubank', p_saldo_inicial_centavos: 250000 };

  it('salvarConta com sucesso invalida contas e formas_pagamento', async () => {
    vi.mocked(comandos.salvarConta).mockResolvedValue(ID_NUBANK as never);
    const { envolver, invalidar } = montar();
    const { result } = renderHook(() => useComandosConta(), { wrapper: envolver });

    await act(() => result.current.salvarConta.mutateAsync(args));

    expect(comandos.salvarConta).toHaveBeenCalledWith(args);
    const chaves = chavesInvalidadas(invalidar);
    expect(chaves).toContainEqual(['contas']);
    expect(chaves).toContainEqual(['formas_pagamento']);
  });

  it('erro não invalida e expõe o ErroDados', async () => {
    vi.mocked(comandos.salvarConta).mockRejectedValue({ tipo: 'rede' });
    const { envolver, invalidar } = montar();
    const { result } = renderHook(() => useComandosConta(), { wrapper: envolver });

    await act(async () => {
      await result.current.salvarConta.mutateAsync(args).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.salvarConta.error).toEqual({ tipo: 'rede' }));
    expect(invalidar).not.toHaveBeenCalled();
  });

  it('arquivarConta e excluirConta invalidam contas e formas_pagamento', async () => {
    vi.mocked(comandos.arquivarConta).mockResolvedValue(undefined as never);
    vi.mocked(comandos.excluirConta).mockResolvedValue(undefined as never);
    const { envolver, invalidar } = montar();
    const { result } = renderHook(() => useComandosConta(), { wrapper: envolver });

    await act(() => result.current.arquivarConta.mutateAsync(ID_NUBANK));
    expect(comandos.arquivarConta).toHaveBeenCalledWith(ID_NUBANK);
    expect(chavesInvalidadas(invalidar)).toEqual(expect.arrayContaining([['contas'], ['formas_pagamento']]));

    invalidar.mockClear();
    await act(() => result.current.excluirConta.mutateAsync(ID_NUBANK));
    expect(comandos.excluirConta).toHaveBeenCalledWith(ID_NUBANK);
    expect(chavesInvalidadas(invalidar)).toEqual(expect.arrayContaining([['contas'], ['formas_pagamento']]));
  });

  it('ajustarSaldo definitivo invalida contas', async () => {
    vi.mocked(comandos.ajustarSaldo).mockResolvedValue(-1230 as never);
    const { envolver, invalidar } = montar();
    const { result } = renderHook(() => useComandosConta(), { wrapper: envolver });

    await act(() => result.current.ajustarSaldo.mutateAsync({ contaId: ID_NUBANK, saldoRealCentavos: 320255 }));

    const [chamada] = vi.mocked(comandos.ajustarSaldo).mock.calls[0] as [Record<string, unknown>];
    expect(chamada).toMatchObject({ contaId: ID_NUBANK, saldoRealCentavos: 320255 });
    expect(chamada.simular).not.toBe(true);
    expect(chavesInvalidadas(invalidar)).toContainEqual(['contas']);
  });
});

describe('usePreviaAjuste', () => {
  it('fica desabilitado sem valor informado', async () => {
    const { envolver } = montar();

    const { result } = renderHook(() => usePreviaAjuste(ID_NUBANK, undefined), { wrapper: envolver });

    await new Promise((r) => setTimeout(r, 20));
    expect(comandos.ajustarSaldo).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('com valor pede a diferença ao servidor com simular e não invalida nada', async () => {
    vi.mocked(comandos.ajustarSaldo).mockResolvedValue(-1230 as never);
    const { envolver, invalidar } = montar();

    const { result } = renderHook(() => usePreviaAjuste(ID_NUBANK, 320255), { wrapper: envolver });

    await waitFor(() => expect(result.current.data).toBe(-1230));
    expect(comandos.ajustarSaldo).toHaveBeenCalledWith({
      contaId: ID_NUBANK,
      saldoRealCentavos: 320255,
      simular: true,
    });
    expect(invalidar).not.toHaveBeenCalled();
  });

  it('valor novo gera nova prévia', async () => {
    vi.mocked(comandos.ajustarSaldo)
      .mockResolvedValueOnce(-1230 as never)
      .mockResolvedValueOnce(5000 as never);
    const { envolver } = montar();

    const { result, rerender } = renderHook(({ valor }) => usePreviaAjuste(ID_NUBANK, valor), {
      wrapper: envolver,
      initialProps: { valor: 320255 },
    });
    await waitFor(() => expect(result.current.data).toBe(-1230));

    rerender({ valor: 326485 });

    await waitFor(() => expect(result.current.data).toBe(5000));
    expect(comandos.ajustarSaldo).toHaveBeenLastCalledWith({
      contaId: ID_NUBANK,
      saldoRealCentavos: 326485,
      simular: true,
    });
  });
});
