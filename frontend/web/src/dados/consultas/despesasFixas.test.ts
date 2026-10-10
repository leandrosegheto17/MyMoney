import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarDespesaFixa, buscarDespesasFixas } from './despesasFixas';

const { fetchSimulado } = vi.hoisted(() => ({ fetchSimulado: vi.fn() }));

vi.mock('../cliente', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('../cliente')>();
  const cliente = real.criarCliente({
    url: 'http://127.0.0.1:54321',
    chave: 'chave-anon-de-teste',
    fetch: fetchSimulado,
  });
  return { ...real, obterCliente: () => cliente };
});

const RESPOSTAS = new URL('../../../../../.md/mockup/respostas/', import.meta.url);

function resposta(nome: string): unknown {
  return JSON.parse(readFileSync(new URL(`${nome}.json`, RESPOSTAS), 'utf8'));
}

function responderCom(corpo: unknown, status = 200) {
  fetchSimulado.mockImplementation(
    async () =>
      new Response(JSON.stringify(corpo), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
}

function chamadasRest() {
  return fetchSimulado.mock.calls
    .map(([entrada, init]: [RequestInfo | URL, RequestInit | undefined]) => {
      const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
      return {
        url: decodeURIComponent(url),
        metodo: (init?.method ?? 'GET').toUpperCase(),
        cabecalhos: new Headers(init?.headers),
      };
    })
    .filter((chamada) => chamada.url.includes('/rest/v1/'));
}

const ID_ALUGUEL = '00000000-0000-4000-8000-000000000701';

afterEach(() => {
  fetchSimulado.mockReset();
});

describe('buscarDespesasFixas', () => {
  it('lê a view despesas_fixas do esquema api e devolve a resposta inteira', async () => {
    responderCom(resposta('despesas-fixas'));

    const dados = await buscarDespesasFixas();

    expect(dados).toEqual(resposta('despesas-fixas'));
    const [chamada] = chamadasRest();
    expect(chamada.metodo).toBe('GET');
    expect(chamada.url).toMatch(/\/rest\/v1\/despesas_fixas\?/);
    expect(chamada.url).toContain('select=*');
    expect(chamada.cabecalhos.get('Accept-Profile')).toBe('api');
  });

  it('devolve lista vazia quando não há modelos', async () => {
    responderCom(resposta('despesas-fixas-vazio'));

    await expect(buscarDespesasFixas()).resolves.toEqual([]);
  });

  it('traduz 503 para indisponivel', async () => {
    responderCom(resposta('erro-servico'), 503);

    await expect(buscarDespesasFixas()).rejects.toMatchObject({ tipo: 'indisponivel' });
  });

  it('traduz falha do fetch para rede', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(buscarDespesasFixas()).rejects.toMatchObject({ tipo: 'rede' });
  });
});

describe('buscarDespesaFixa', () => {
  it('filtra pelo id e devolve o item único', async () => {
    responderCom(resposta('despesa-fixa'));

    const dados = await buscarDespesaFixa(ID_ALUGUEL);

    expect(dados).toEqual((resposta('despesa-fixa') as unknown[])[0]);
    const [chamada] = chamadasRest();
    expect(chamada.url).toMatch(/\/rest\/v1\/despesas_fixas\?/);
    expect(chamada.url).toContain(`id=eq.${ID_ALUGUEL}`);
    expect(chamada.cabecalhos.get('Accept-Profile')).toBe('api');
  });

  it('lista vazia (inexistente ou alheio) vira registro_invalido', async () => {
    responderCom([]);

    await expect(buscarDespesaFixa(ID_ALUGUEL)).rejects.toEqual({
      tipo: 'regra',
      codigo: 'registro_invalido',
    });
  });

  it('id que não é uuid vira registro_invalido sem requisição', async () => {
    await expect(buscarDespesaFixa('abc')).rejects.toEqual({
      tipo: 'regra',
      codigo: 'registro_invalido',
    });
    expect(chamadasRest()).toHaveLength(0);
  });

  it('traduz 503 para indisponivel', async () => {
    responderCom(resposta('erro-servico'), 503);

    await expect(buscarDespesaFixa(ID_ALUGUEL)).rejects.toMatchObject({ tipo: 'indisponivel' });
  });

  it('traduz falha do fetch para rede', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(buscarDespesaFixa(ID_ALUGUEL)).rejects.toMatchObject({ tipo: 'rede' });
  });
});
