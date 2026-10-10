import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ajustarSaldo, arquivarConta, excluirConta, salvarConta } from './contas';

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

const lerResposta = (nome: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../../.md/mockup/respostas/${nome}`, import.meta.url), 'utf8'));

const responder = (status: number, corpo: unknown) => () =>
  Promise.resolve(
    new Response(corpo === undefined ? null : JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

function requisicoesRest() {
  return fetchSimulado.mock.calls
    .map(([entrada, init]) => ({
      url: new URL(String(entrada)),
      metodo: (init?.method ?? 'GET').toUpperCase(),
      cabecalhos: new Headers(init?.headers),
      corpo: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined,
    }))
    .filter((r) => r.url.pathname.startsWith('/rest/v1/'));
}

const ID_CONTA = '00000000-0000-4000-8000-000000000201';

beforeEach(() => {
  fetchSimulado.mockReset();
});

describe('salvarConta', () => {
  it('faz POST em rpc/salvar_conta com p_id, p_nome e p_saldo_inicial_centavos', async () => {
    fetchSimulado.mockImplementation(responder(200, ID_CONTA));

    await salvarConta({ p_id: ID_CONTA, p_nome: 'Nubank', p_saldo_inicial_centavos: 250000 });

    const reqs = requisicoesRest();
    expect(reqs).toHaveLength(1);
    expect(reqs[0].metodo).toBe('POST');
    expect(reqs[0].url.pathname).toBe('/rest/v1/rpc/salvar_conta');
    expect(reqs[0].cabecalhos.get('Content-Profile')).toBe('api');
    expect(reqs[0].corpo).toEqual({ p_id: ID_CONTA, p_nome: 'Nubank', p_saldo_inicial_centavos: 250000 });
  });

  it('usa o id recebido de quem chama (reenvio idempotente)', async () => {
    fetchSimulado.mockImplementation(responder(200, ID_CONTA));
    const args = { p_id: ID_CONTA, p_nome: 'Nubank', p_saldo_inicial_centavos: 0 };

    await salvarConta(args);
    await salvarConta(args);

    const [primeira, segunda] = requisicoesRest();
    expect(primeira.corpo?.p_id).toBe(ID_CONTA);
    expect(segunda.corpo?.p_id).toBe(ID_CONTA);
  });

  it('erro de regra vira { tipo: regra, codigo }', async () => {
    fetchSimulado.mockImplementation(responder(400, lerResposta('erro-registro-invalido.json')));
    await expect(
      salvarConta({ p_id: ID_CONTA, p_nome: 'Nubank', p_saldo_inicial_centavos: 0 }),
    ).rejects.toEqual({ tipo: 'regra', codigo: 'registro_invalido' });
  });

  it('falha de rede vira rede', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(
      salvarConta({ p_id: ID_CONTA, p_nome: 'Nubank', p_saldo_inicial_centavos: 0 }),
    ).rejects.toEqual({ tipo: 'rede' });
  });
});

describe('arquivarConta', () => {
  it('faz POST em rpc/arquivar_conta com p_id', async () => {
    fetchSimulado.mockImplementation(responder(204, undefined));

    await arquivarConta(ID_CONTA);

    const [req] = requisicoesRest();
    expect(req.metodo).toBe('POST');
    expect(req.url.pathname).toBe('/rest/v1/rpc/arquivar_conta');
    expect(req.corpo).toEqual({ p_id: ID_CONTA });
  });

  it('registro inválido vira regra registro_invalido', async () => {
    fetchSimulado.mockImplementation(responder(400, lerResposta('erro-registro-invalido.json')));
    await expect(arquivarConta(ID_CONTA)).rejects.toEqual({ tipo: 'regra', codigo: 'registro_invalido' });
  });
});

describe('excluirConta', () => {
  it('faz POST em rpc/excluir_conta com p_id', async () => {
    fetchSimulado.mockImplementation(responder(204, undefined));

    await excluirConta(ID_CONTA);

    const [req] = requisicoesRest();
    expect(req.metodo).toBe('POST');
    expect(req.url.pathname).toBe('/rest/v1/rpc/excluir_conta');
    expect(req.corpo).toEqual({ p_id: ID_CONTA });
  });

  it('conta com vínculo devolve o código em_uso', async () => {
    fetchSimulado.mockImplementation(responder(400, { code: 'P0001', message: 'em_uso', details: null, hint: null }));
    await expect(excluirConta(ID_CONTA)).rejects.toEqual({ tipo: 'regra', codigo: 'em_uso' });
  });

  it('registro inválido vira regra registro_invalido', async () => {
    fetchSimulado.mockImplementation(responder(400, lerResposta('erro-registro-invalido.json')));
    await expect(excluirConta(ID_CONTA)).rejects.toEqual({ tipo: 'regra', codigo: 'registro_invalido' });
  });
});

describe('ajustarSaldo', () => {
  it('com simular envia p_simular true e devolve a diferença em centavos', async () => {
    fetchSimulado.mockImplementation(responder(200, -1230));

    const diferenca = await ajustarSaldo({ contaId: ID_CONTA, saldoRealCentavos: 320255, simular: true });

    expect(diferenca).toBe(-1230);
    const [req] = requisicoesRest();
    expect(req.metodo).toBe('POST');
    expect(req.url.pathname).toBe('/rest/v1/rpc/ajustar_saldo');
    expect(req.corpo).toEqual({ p_conta_id: ID_CONTA, p_saldo_real_centavos: 320255, p_simular: true });
  });

  it('sem simular envia p_simular false', async () => {
    fetchSimulado.mockImplementation(responder(200, -1230));

    await ajustarSaldo({ contaId: ID_CONTA, saldoRealCentavos: 320255, simular: false });

    expect(requisicoesRest()[0].corpo).toEqual({
      p_conta_id: ID_CONTA,
      p_saldo_real_centavos: 320255,
      p_simular: false,
    });
  });

  it('valor inválido vira regra valor_invalido', async () => {
    fetchSimulado.mockImplementation(responder(400, { code: 'P0001', message: 'valor_invalido', details: null, hint: null }));
    await expect(
      ajustarSaldo({ contaId: ID_CONTA, saldoRealCentavos: -1, simular: true }),
    ).rejects.toEqual({ tipo: 'regra', codigo: 'valor_invalido' });
  });

  it('falha de rede vira rede', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(
      ajustarSaldo({ contaId: ID_CONTA, saldoRealCentavos: 320255, simular: false }),
    ).rejects.toEqual({ tipo: 'rede' });
  });
});

describe('escrita só por rpc', () => {
  it('nenhum comando usa PATCH, PUT, DELETE ou POST fora de /rpc/', async () => {
    fetchSimulado.mockImplementation(responder(200, null));

    await salvarConta({ p_id: ID_CONTA, p_nome: 'Nubank', p_saldo_inicial_centavos: 0 });
    await arquivarConta(ID_CONTA);
    await excluirConta(ID_CONTA);
    await ajustarSaldo({ contaId: ID_CONTA, saldoRealCentavos: 0, simular: false });

    for (const req of requisicoesRest()) {
      expect(req.metodo).toBe('POST');
      expect(req.url.pathname.startsWith('/rest/v1/rpc/')).toBe(true);
    }
  });
});
