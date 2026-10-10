import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarFetchSimulado, json, lerResposta, type Rota } from '../../../test/apoio/fetchSimulado';

let simulado: ReturnType<typeof criarFetchSimulado>;

async function carregar(rota: Rota) {
  simulado = criarFetchSimulado(rota);
  vi.stubGlobal('fetch', simulado.fetch);
  vi.resetModules();
  return import('./contexto');
}

const CONTEXTO = lerResposta('contexto.json');

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-falsa');
  vi.stubEnv('VITE_MODO_COMPARACAO', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('buscarContexto', () => {
  it('chama POST /rest/v1/rpc/contexto no schema api e devolve o contexto', async () => {
    const { buscarContexto } = await carregar(({ url }) =>
      url.pathname.endsWith('/rest/v1/rpc/contexto') ? json(CONTEXTO) : undefined,
    );

    await expect(buscarContexto()).resolves.toEqual(CONTEXTO);

    const [chamada] = simulado.chamadasA('/rest/v1/rpc/contexto');
    expect(chamada.metodo).toBe('POST');
    expect(chamada.cabecalhos.get('Content-Profile')).toBe('api');
    expect(chamada.cabecalhos.get('apikey')).toBe('chave-falsa');
  });

  it('erro de rede rejeita com { tipo: "rede" }', async () => {
    const { buscarContexto } = await carregar(() => {
      throw new TypeError('Failed to fetch');
    });
    await expect(buscarContexto()).rejects.toEqual({ tipo: 'rede' });
  });

  it('503 rejeita com { tipo: "indisponivel" }', async () => {
    const { buscarContexto } = await carregar(() => json(lerResposta('erro-servico.json'), 503));
    await expect(buscarContexto()).rejects.toEqual({ tipo: 'indisponivel' });
  });

  it('erro de regra rejeita com o código do contrato', async () => {
    const { buscarContexto } = await carregar(() => json(lerResposta('erro-registro-invalido.json'), 400));
    await expect(buscarContexto()).rejects.toEqual({ tipo: 'regra', codigo: 'registro_invalido' });
  });
});
