import { beforeEach, describe, expect, it, vi } from 'vitest';
import { json, lerResposta } from '../../../test/apoio/fetchSimulado';
import { lancarDespesa } from './lancarDespesa';

const { fetchSimulado } = vi.hoisted(() => ({ fetchSimulado: vi.fn<typeof fetch>() }));

vi.mock('../cliente', async (importOriginal) => {
  const original = await importOriginal<typeof import('../cliente')>();
  const cliente = original.criarCliente({
    url: 'https://teste.supabase.co',
    chave: 'chave-anon-de-teste',
    fetch: (...args: Parameters<typeof fetch>) => fetchSimulado(...args),
  });
  return { ...original, obterCliente: () => cliente };
});

const ARGS = {
  p_id: '00000000-0000-4000-8000-000000000530',
  p_valor_centavos: 36000,
  p_categoria_id: '00000000-0000-4000-8000-000000000401',
  p_forma_id: '00000000-0000-4000-8000-000000000303',
  p_parcelas: 3,
  p_data: '2026-10-09',
  p_descricao: 'Compra do mês',
};

function requisicoesRest() {
  return fetchSimulado.mock.calls
    .map(([entrada, init]) => ({
      url: new URL(String(entrada)),
      metodo: (init?.method ?? 'GET').toUpperCase(),
      cabecalhos: new Headers(init?.headers),
      corpo: init?.body ? JSON.parse(String(init.body)) : undefined,
    }))
    .filter((r) => r.url.pathname.startsWith('/rest/v1/'));
}

beforeEach(() => {
  fetchSimulado.mockReset();
});

describe('lancarDespesa', () => {
  it('faz POST em rpc/lancar_despesa com a chamada completa e devolve a resposta', async () => {
    fetchSimulado.mockImplementation(async () => json(lerResposta('lancar-despesa-credito.json')));

    const resposta = await lancarDespesa(ARGS);

    expect(resposta).toEqual(lerResposta('lancar-despesa-credito.json'));
    const [req] = requisicoesRest();
    expect(req.metodo).toBe('POST');
    expect(req.url.pathname).toBe('/rest/v1/rpc/lancar_despesa');
    expect(req.cabecalhos.get('Content-Profile')).toBe('api');
    expect(req.corpo).toEqual(ARGS);
  });

  it('erro de regra vira { tipo: regra, codigo }', async () => {
    fetchSimulado.mockImplementation(async () => json(lerResposta('erro-registro-invalido.json'), 400));
    await expect(lancarDespesa(ARGS)).rejects.toEqual({ tipo: 'regra', codigo: 'registro_invalido' });
  });

  it('503 vira indisponivel', async () => {
    fetchSimulado.mockImplementation(async () => json(lerResposta('erro-servico.json'), 503));
    await expect(lancarDespesa(ARGS)).rejects.toEqual({ tipo: 'indisponivel' });
  });

  it('falha de rede vira rede', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(lancarDespesa(ARGS)).rejects.toEqual({ tipo: 'rede' });
  });
});
