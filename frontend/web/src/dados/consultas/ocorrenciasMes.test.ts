import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarOcorrenciasMes } from './ocorrenciasMes';

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

describe('buscarOcorrenciasMes', () => {
  it('chama a RPC com o primeiro dia do mês e devolve a resposta intacta', async () => {
    responderCom(resposta('ocorrencias-mes'));

    const dados = await buscarOcorrenciasMes('2026-10');

    expect(dados).toEqual(resposta('ocorrencias-mes'));
    const [chamada] = chamadasRest();
    expect(chamada.metodo).toBe('POST');
    expect(chamada.url).toMatch(/\/rest\/v1\/rpc\/ocorrencias_mes$/);
    expect(chamada.cabecalhos.get('Content-Profile')).toBe('api');
    expect(chamada.corpo).toEqual({ p_mes: '2026-10-01' });
  });

  it('preserva a ordem da API, o pagador e o valor pago nulo', async () => {
    responderCom(resposta('ocorrencias-mes'));

    const dados = await buscarOcorrenciasMes('2026-10');

    expect(dados.ocorrencias.map((o) => o.descricao)).toEqual([
      'Internet',
      'Aluguel',
      'Condomínio',
      'Luz',
      'Água',
      'Gás',
      'Diarista',
    ]);
    expect(dados.ocorrencias[0].valor_pago_centavos).toBeNull();
    expect(dados.ocorrencias[0].pagador).toBeNull();
    expect(dados.ocorrencias[4].pagador).toEqual({ nome: 'Leandro', sou_eu: true });
    expect(dados.pagas).toBe(4);
    expect(dados.total).toBe(7);
    expect(dados.previsto_a_pagar_centavos).toBe(154000);
  });

  it('devolve o mês vazio como veio', async () => {
    responderCom(resposta('ocorrencias-mes-vazio'));

    await expect(buscarOcorrenciasMes('2026-10')).resolves.toEqual(resposta('ocorrencias-mes-vazio'));
  });

  it('traduz 503 para indisponivel', async () => {
    responderCom(resposta('erro-servico'), 503);

    await expect(buscarOcorrenciasMes('2026-10')).rejects.toMatchObject({ tipo: 'indisponivel' });
  });

  it('traduz falha do fetch para rede', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(buscarOcorrenciasMes('2026-10')).rejects.toMatchObject({ tipo: 'rede' });
  });
});
