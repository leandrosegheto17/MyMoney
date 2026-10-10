import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  desfazerPagamento,
  encerrarDespesaFixa,
  pagarOcorrencia,
  salvarDespesaFixa,
} from './despesasFixas';

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
      new Response(corpo === undefined ? null : JSON.stringify(corpo), {
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
        corpo: init?.body ? JSON.parse(String(init.body)) : undefined,
      };
    })
    .filter((chamada) => chamada.url.includes('/rest/v1/'));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID_ALUGUEL = '00000000-0000-4000-8000-000000000701';
const ID_MORADIA = '00000000-0000-4000-8000-000000000403';
const ID_OCORRENCIA_INTERNET = '00000000-0000-4000-8000-000000000804';
const ID_OCORRENCIA_AGUA = '00000000-0000-4000-8000-000000000806';
const ID_PIX = '00000000-0000-4000-8000-000000000301';

beforeEach(() => {
  responderCom(null, 200);
});

afterEach(() => {
  fetchSimulado.mockReset();
});

describe('salvarDespesaFixa', () => {
  it('envia os parâmetros p_* da RPC salvar_despesa_fixa com o id de quem chama', async () => {
    responderCom(ID_ALUGUEL);

    await salvarDespesaFixa({
      id: ID_ALUGUEL,
      descricao: 'Aluguel',
      categoriaId: ID_MORADIA,
      valorPrevistoCentavos: 120000,
      diaVencimento: 10,
    });

    const [chamada] = chamadasRest();
    expect(chamada.metodo).toBe('POST');
    expect(chamada.url).toMatch(/\/rest\/v1\/rpc\/salvar_despesa_fixa$/);
    expect(chamada.corpo).toEqual({
      p_id: ID_ALUGUEL,
      p_descricao: 'Aluguel',
      p_categoria_id: ID_MORADIA,
      p_valor_previsto_centavos: 120000,
      p_dia_vencimento: 10,
    });
  });
});

describe('encerrarDespesaFixa', () => {
  it('envia p_id para encerrar_despesa_fixa', async () => {
    await encerrarDespesaFixa(ID_ALUGUEL);

    const [chamada] = chamadasRest();
    expect(chamada.url).toMatch(/\/rest\/v1\/rpc\/encerrar_despesa_fixa$/);
    expect(chamada.corpo).toEqual({ p_id: ID_ALUGUEL });
  });
});

describe('pagarOcorrencia', () => {
  it('sem valor e sem data não envia as chaves (o servidor aplica previsto e hoje)', async () => {
    await pagarOcorrencia({ ocorrenciaId: ID_OCORRENCIA_INTERNET, formaId: ID_PIX });

    const [chamada] = chamadasRest();
    expect(chamada.url).toMatch(/\/rest\/v1\/rpc\/pagar_ocorrencia$/);
    expect(chamada.corpo).toMatchObject({
      p_ocorrencia_id: ID_OCORRENCIA_INTERNET,
      p_forma_id: ID_PIX,
    });
    expect(chamada.corpo).not.toHaveProperty('p_valor_centavos');
    expect(chamada.corpo).not.toHaveProperty('p_data');
    expect(chamada.corpo.p_id).toMatch(UUID);
  });

  it('com valor e data, envia os dois', async () => {
    await pagarOcorrencia({
      ocorrenciaId: ID_OCORRENCIA_INTERNET,
      formaId: ID_PIX,
      valorCentavos: 12490,
      data: '2026-10-09',
    });

    const [chamada] = chamadasRest();
    expect(chamada.corpo).toMatchObject({
      p_ocorrencia_id: ID_OCORRENCIA_INTERNET,
      p_forma_id: ID_PIX,
      p_valor_centavos: 12490,
      p_data: '2026-10-09',
    });
  });

  it('traduz falha do fetch para rede', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      pagarOcorrencia({ ocorrenciaId: ID_OCORRENCIA_INTERNET, formaId: ID_PIX }),
    ).rejects.toMatchObject({ tipo: 'rede' });
  });
});

describe('desfazerPagamento', () => {
  it('envia p_ocorrencia_id para desfazer_pagamento', async () => {
    await desfazerPagamento(ID_OCORRENCIA_AGUA);

    const [chamada] = chamadasRest();
    expect(chamada.url).toMatch(/\/rest\/v1\/rpc\/desfazer_pagamento$/);
    expect(chamada.corpo).toEqual({ p_ocorrencia_id: ID_OCORRENCIA_AGUA });
  });

  it('recusa do servidor (outro membro) chega traduzida como registro_invalido', async () => {
    responderCom(resposta('erro-registro-invalido'), 400);

    await expect(desfazerPagamento(ID_OCORRENCIA_AGUA)).rejects.toEqual({
      tipo: 'regra',
      codigo: 'registro_invalido',
    });
  });
});

describe('escrita só por RPC', () => {
  it('nenhum comando usa a view diretamente', async () => {
    await salvarDespesaFixa({
      id: ID_ALUGUEL,
      descricao: 'Aluguel',
      categoriaId: ID_MORADIA,
      valorPrevistoCentavos: 120000,
      diaVencimento: 10,
    });
    await encerrarDespesaFixa(ID_ALUGUEL);
    await pagarOcorrencia({ ocorrenciaId: ID_OCORRENCIA_INTERNET, formaId: ID_PIX });
    await desfazerPagamento(ID_OCORRENCIA_AGUA);

    const chamadas = chamadasRest();
    expect(chamadas).toHaveLength(4);
    for (const chamada of chamadas) {
      expect(chamada.metodo).toBe('POST');
      expect(chamada.url).toContain('/rest/v1/rpc/');
    }
  });
});
