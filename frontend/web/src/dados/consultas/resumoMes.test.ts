import { afterEach, describe, expect, it, vi } from 'vitest';
import { lerResposta } from '../../../test/apoio/fetchSimulado';
import { buscarResumoMes } from './resumoMes';

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

const resumo = lerResposta('resumo-mes.json');

function responderCom(corpo: unknown, status = 200) {
  fetchSimulado.mockImplementation(
    async () => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

function ultimaChamada() {
  const [entrada, init] = fetchSimulado.mock.calls[fetchSimulado.mock.calls.length - 1] as [
    RequestInfo | URL,
    RequestInit | undefined,
  ];
  const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
  return {
    url,
    metodo: (init?.method ?? 'GET').toUpperCase(),
    corpo: init?.body ? JSON.parse(String(init.body)) : undefined,
  };
}

afterEach(() => {
  fetchSimulado.mockReset();
});

describe('buscarResumoMes', () => {
  it('chama rpc/resumo_mes com o 1º dia do mês', async () => {
    responderCom(resumo);

    await buscarResumoMes('2026-10');

    const chamada = ultimaChamada();
    expect(chamada.metodo).toBe('POST');
    expect(new URL(chamada.url).pathname).toBe('/rest/v1/rpc/resumo_mes');
    expect(chamada.corpo).toEqual({ p_mes: '2026-10-01' });
  });

  it('devolve a resposta na forma de respostas/resumo-mes.json', async () => {
    responderCom(resumo);

    await expect(buscarResumoMes('2026-10')).resolves.toEqual(resumo);
  });

  it('503 → indisponivel', async () => {
    responderCom(lerResposta('erro-servico.json'), 503);

    await expect(buscarResumoMes('2026-10')).rejects.toEqual({ tipo: 'indisponivel' });
  });

  it('falha de rede → rede', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(buscarResumoMes('2026-10')).rejects.toEqual({ tipo: 'rede' });
  });
});
