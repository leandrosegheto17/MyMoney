import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copiarOrcamento, definirOrcamento } from '../dados/comandos/orcamento';
import { useComandosOrcamento } from './useComandosOrcamento';

vi.mock('../dados/comandos/orcamento', () => ({
  definirOrcamento: vi.fn(),
  copiarOrcamento: vi.fn(),
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

const ID_CONTAS_DA_CASA = '00000000-0000-4000-8000-000000000404';
const DEFINIR = { mes: '2026-10', categoriaId: ID_CONTAS_DA_CASA, valorCentavos: 30000 };
const COPIAR = { mes: '2026-11', escopo: 'conjunto' };

afterEach(() => {
  vi.mocked(definirOrcamento).mockReset();
  vi.mocked(copiarOrcamento).mockReset();
  onlineManager.setOnline(true);
});

describe('useComandosOrcamento', () => {
  it('definir invalida o prefixo orcamento_mes (os dois escopos) e resumo_mes', async () => {
    vi.mocked(definirOrcamento).mockResolvedValue(undefined as never);
    const { envoltorio, chavesInvalidadas } = criarAmbiente();
    const { result } = renderHook(() => useComandosOrcamento(), { wrapper: envoltorio });

    await act(() => executar(result.current.definirOrcamento, DEFINIR));

    expect(definirOrcamento).toHaveBeenCalledWith(DEFINIR);
    const chaves = chavesInvalidadas();
    expect(chaves).toContainEqual(['orcamento_mes']);
    expect(chaves.some((chave) => chave[0] === 'resumo_mes')).toBe(true);
  });

  it('remover (valor null) segue o mesmo caminho do definir', async () => {
    vi.mocked(definirOrcamento).mockResolvedValue(undefined as never);
    const { envoltorio, chavesInvalidadas } = criarAmbiente();
    const { result } = renderHook(() => useComandosOrcamento(), { wrapper: envoltorio });
    const remover = { ...DEFINIR, valorCentavos: null };

    await act(() => executar(result.current.definirOrcamento, remover));

    expect(definirOrcamento).toHaveBeenCalledWith(remover);
    expect(chavesInvalidadas()).toContainEqual(['orcamento_mes']);
  });

  it('copiar invalida o prefixo orcamento_mes e resumo_mes e devolve o número copiado', async () => {
    vi.mocked(copiarOrcamento).mockResolvedValue(5 as never);
    const { envoltorio, chavesInvalidadas } = criarAmbiente();
    const { result } = renderHook(() => useComandosOrcamento(), { wrapper: envoltorio });

    let copiadas: unknown;
    await act(async () => {
      copiadas = await executar(result.current.copiarOrcamento, COPIAR);
    });

    expect(copiarOrcamento).toHaveBeenCalledWith(COPIAR);
    expect(copiadas).toBe(5);
    const chaves = chavesInvalidadas();
    expect(chaves).toContainEqual(['orcamento_mes']);
    expect(chaves.some((chave) => chave[0] === 'resumo_mes')).toBe(true);
  });

  it('erro não invalida e sobe como ErroDados', async () => {
    vi.mocked(definirOrcamento).mockRejectedValue({ tipo: 'regra', codigo: 'valor_invalido' });
    const { envoltorio, espiaInvalidar } = criarAmbiente();
    const { result } = renderHook(() => useComandosOrcamento(), { wrapper: envoltorio });

    await act(async () => {
      await expect(executar(result.current.definirOrcamento, DEFINIR)).rejects.toEqual({
        tipo: 'regra',
        codigo: 'valor_invalido',
      });
    });

    expect(espiaInvalidar).not.toHaveBeenCalled();
  });

  it('sem rede a mutação não fica pausada: chama o comando e devolve rede', async () => {
    onlineManager.setOnline(false);
    vi.mocked(copiarOrcamento).mockRejectedValue({ tipo: 'rede' });
    const { envoltorio, espiaInvalidar } = criarAmbiente();
    const { result } = renderHook(() => useComandosOrcamento(), { wrapper: envoltorio });

    let promessa: Promise<unknown> | undefined;
    act(() => {
      promessa = executar(result.current.copiarOrcamento, COPIAR);
      promessa.catch(() => {});
    });

    await waitFor(() => expect(copiarOrcamento).toHaveBeenCalledTimes(1));
    await expect(promessa).rejects.toEqual({ tipo: 'rede' });
    expect(espiaInvalidar).not.toHaveBeenCalled();
  });
});
