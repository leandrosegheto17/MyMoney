import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarFetchSimulado, json, lerResposta } from '../../test/apoio/fetchSimulado';

const CONTEXTO = lerResposta('contexto.json');

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('criarCliente', () => {
  it('usa o fetch injetado, o schema api e a chave anon', async () => {
    const simulado = criarFetchSimulado(() => json(CONTEXTO));
    const { criarCliente } = await import('./cliente');
    const cliente = criarCliente({ url: 'http://127.0.0.1:54321', chave: 'chave-falsa', fetch: simulado.fetch });

    const { data } = await cliente.rpc('contexto');

    expect(data).toEqual(CONTEXTO);
    const [chamada] = simulado.chamadas;
    expect(chamada.url.href).toBe('http://127.0.0.1:54321/rest/v1/rpc/contexto');
    expect(chamada.cabecalhos.get('Content-Profile')).toBe('api');
    expect(chamada.cabecalhos.get('apikey')).toBe('chave-falsa');
  });
});

describe('obterCliente', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-falsa');
  });

  it('devolve sempre a mesma instância', async () => {
    vi.stubEnv('VITE_MODO_COMPARACAO', '');
    const { obterCliente } = await import('./cliente');
    expect(obterCliente()).toBe(obterCliente());
  });

  it('em sessao-falsa envia o token falso para a URL fictícia', async () => {
    vi.stubEnv('VITE_MODO_COMPARACAO', 'sessao-falsa');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://comparacao.invalid');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-de-comparacao');
    const simulado = criarFetchSimulado(() => json(CONTEXTO));
    vi.stubGlobal('fetch', simulado.fetch);

    const { obterCliente } = await import('./cliente');
    const { sessaoFalsa } = await import('./modoComparacao');
    await obterCliente().rpc('contexto');

    const chamada = simulado.chamadasA('/rest/v1/rpc/contexto')[0];
    expect(chamada.url.href).toBe('https://comparacao.invalid/rest/v1/rpc/contexto');
    expect(chamada.cabecalhos.get('Authorization')).toBe(`Bearer ${sessaoFalsa().access_token}`);
    expect(simulado.chamadasA('/auth/v1/')).toEqual([]);
  });
});
