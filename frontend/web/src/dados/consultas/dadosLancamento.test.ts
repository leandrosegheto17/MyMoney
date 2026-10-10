import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { json, lerResposta } from '../../../test/apoio/fetchSimulado';

const { fetchSimulado, sessao } = vi.hoisted(() => ({
  fetchSimulado: vi.fn<typeof fetch>(),
  sessao: { usuario: '00000000-0000-4000-8000-0000000000a1' },
}));

vi.mock('../cliente', async (importOriginal) => {
  const original = await importOriginal<typeof import('../cliente')>();
  const cliente = original.criarCliente({
    url: 'https://teste.supabase.co',
    chave: 'chave-anon-de-teste',
    fetch: (...args: Parameters<typeof fetch>) => fetchSimulado(...args),
  });
  return { ...original, obterCliente: () => cliente };
});

vi.mock('../sessao', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sessao')>()),
  obterSessao: vi.fn(async () => ({ user: { id: sessao.usuario } })),
}));

const A = '00000000-0000-4000-8000-0000000000a1';
const B = '00000000-0000-4000-8000-0000000000b1';

async function carregar() {
  vi.resetModules();
  const consulta = await import('./dadosLancamento');
  const cache = await import('../local/cacheDadosLancamento');
  return { ...consulta, ...cache };
}

const chamadasRpc = () =>
  fetchSimulado.mock.calls.filter(([entrada]) =>
    new URL(String(entrada)).pathname.endsWith('/rest/v1/rpc/dados_lancamento'),
  );

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  fetchSimulado.mockReset();
  sessao.usuario = A;
});

describe('buscarDadosLancamento', () => {
  it('com rede chama rpc/dados_lancamento, devolve a resposta e grava o cache', async () => {
    fetchSimulado.mockImplementation(async () => json(lerResposta('dados-lancamento.json')));
    const { buscarDadosLancamento, lerCache } = await carregar();

    const resultado = await buscarDadosLancamento();

    expect(resultado.dados).toEqual(lerResposta('dados-lancamento.json'));
    expect(resultado.doAparelho).toBe(false);
    const [[, init]] = chamadasRpc();
    expect((init?.method ?? 'GET').toUpperCase()).toBe('POST');
    expect((await lerCache(A))?.dados).toEqual(lerResposta('dados-lancamento.json'));
  });

  it('sem rede devolve o cache, marcado como do aparelho e com a hora em que foi salvo', async () => {
    fetchSimulado.mockImplementation(async () => json(lerResposta('dados-lancamento.json')));
    const { buscarDadosLancamento, lerCache } = await carregar();
    await buscarDadosLancamento();
    const salvoEm = (await lerCache(A))?.salvoEm;

    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));
    const resultado = await buscarDadosLancamento();

    expect(resultado).toEqual({ dados: lerResposta('dados-lancamento.json'), doAparelho: true, salvoEm });
  });

  it('sem rede e sem cache rejeita com { tipo: rede }', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));
    const { buscarDadosLancamento } = await carregar();

    await expect(buscarDadosLancamento()).rejects.toEqual({ tipo: 'rede' });
  });

  it('serviço indisponível (503) também usa o cache', async () => {
    fetchSimulado.mockImplementation(async () => json(lerResposta('dados-lancamento.json')));
    const { buscarDadosLancamento } = await carregar();
    await buscarDadosLancamento();

    fetchSimulado.mockImplementation(async () => json(lerResposta('erro-servico.json'), 503));
    const resultado = await buscarDadosLancamento();

    expect(resultado.doAparelho).toBe(true);
    expect(resultado.dados).toEqual(lerResposta('dados-lancamento.json'));
  });

  it('erro de regra rejeita e deixa o cache anterior intacto', async () => {
    fetchSimulado.mockImplementation(async () => json(lerResposta('dados-lancamento.json')));
    const { buscarDadosLancamento, lerCache } = await carregar();
    await buscarDadosLancamento();

    fetchSimulado.mockImplementation(async () => json(lerResposta('erro-registro-invalido.json'), 400));
    await expect(buscarDadosLancamento()).rejects.toEqual({ tipo: 'regra', codigo: 'registro_invalido' });

    expect((await lerCache(A))?.dados).toEqual(lerResposta('dados-lancamento.json'));
  });

  it('nova resposta com rede sobrescreve o cache', async () => {
    fetchSimulado.mockImplementation(async () => json(lerResposta('dados-lancamento.json')));
    const { buscarDadosLancamento, lerCache } = await carregar();
    await buscarDadosLancamento();

    fetchSimulado.mockImplementation(async () => json(lerResposta('dados-lancamento-sem-formas.json')));
    await buscarDadosLancamento();

    expect((await lerCache(A))?.dados).toEqual(lerResposta('dados-lancamento-sem-formas.json'));
  });

  it('sem rede, outro usuário não recebe o cache do primeiro', async () => {
    fetchSimulado.mockImplementation(async () => json(lerResposta('dados-lancamento.json')));
    const { buscarDadosLancamento } = await carregar();
    await buscarDadosLancamento();

    sessao.usuario = B;
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(buscarDadosLancamento()).rejects.toEqual({ tipo: 'rede' });
  });
});

describe('lerDadosDoAparelho', () => {
  it('devolve o cache do usuário atual sem chamar a rede', async () => {
    fetchSimulado.mockImplementation(async () => json(lerResposta('dados-lancamento.json')));
    const { buscarDadosLancamento, lerDadosDoAparelho } = await carregar();
    await buscarDadosLancamento();
    fetchSimulado.mockClear();

    const resultado = await lerDadosDoAparelho();

    expect(resultado?.dados).toEqual(lerResposta('dados-lancamento.json'));
    expect(chamadasRpc()).toHaveLength(0);
  });
});
