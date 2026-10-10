import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarOrcamentoMes } from './orcamentoMes';

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
        corpo: init?.body ? JSON.parse(String(init.body)) : undefined,
      };
    })
    .filter((chamada) => chamada.url.includes('/rest/v1/'));
}

afterEach(() => {
  fetchSimulado.mockReset();
});

describe('buscarOrcamentoMes', () => {
  it('chama orcamento_mes com o primeiro dia do mês e o escopo da API', async () => {
    responderCom(resposta('orcamento-mes'));

    const dados = await buscarOrcamentoMes('2026-10', 'conjunto');

    expect(dados).toEqual(resposta('orcamento-mes'));
    const [chamada] = chamadasRest();
    expect(chamada.metodo).toBe('POST');
    expect(chamada.url).toMatch(/\/rest\/v1\/rpc\/orcamento_mes$/);
    expect(chamada.cabecalhos.get('Content-Profile')).toBe('api');
    expect(chamada.corpo).toEqual({ p_mes: '2026-10-01', p_escopo: 'conjunto' });
  });

  it('preserva a ordem das linhas e o sem_orcamento vazio', async () => {
    responderCom(resposta('orcamento-mes'));

    const dados = await buscarOrcamentoMes('2026-10', 'conjunto');

    expect(dados.linhas[0].categoria_id).toBe('00000000-0000-4000-8000-000000000404');
    expect(dados.linhas.map((l) => l.nome)).toEqual([
      'Contas da casa',
      'Delivery/iFood do casal',
      'Mercado',
      'Outros da casa',
      'Moradia',
    ]);
    expect(dados.sem_orcamento).toEqual([]);
  });

  it('mês sem orçamento vem com anterior e total nulo', async () => {
    responderCom(resposta('orcamento-mes-vazio'));

    const dados = await buscarOrcamentoMes('2026-11', 'individual');

    expect(dados).toEqual(resposta('orcamento-mes-vazio'));
    expect(dados.total).toBeNull();
    expect(dados.anterior).toEqual({ mes: '2026-10-01', orcado_centavos: 430000, categorias: 5 });
    expect(chamadasRest()[0].corpo).toEqual({ p_mes: '2026-11-01', p_escopo: 'individual' });
  });

  it('traduz 503 para indisponivel', async () => {
    responderCom(resposta('erro-servico'), 503);

    await expect(buscarOrcamentoMes('2026-10', 'conjunto')).rejects.toMatchObject({ tipo: 'indisponivel' });
  });

  it('traduz falha do fetch para rede', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(buscarOrcamentoMes('2026-10', 'conjunto')).rejects.toMatchObject({ tipo: 'rede' });
  });
});
