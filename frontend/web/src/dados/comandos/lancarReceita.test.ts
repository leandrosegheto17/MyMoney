import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lancarReceita } from './lancarReceita';

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

const lerResposta = (nome: string): Record<string, unknown> =>
  JSON.parse(readFileSync(new URL(`../../../../../.md/mockup/respostas/${nome}`, import.meta.url), 'utf8'));

const responder = (status: number, corpo: unknown) => () =>
  Promise.resolve(new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }));

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

const ARGS = {
  p_id: '6f1c2b7e-4a3d-4c1e-9b2a-0d5e8f7a6b21',
  p_valor_centavos: 750000,
  p_categoria_id: '00000000-0000-4000-8000-000000000421',
  p_conta_id: '00000000-0000-4000-8000-000000000201',
  p_data: '2026-10-09',
  p_descricao: null,
};

// Sem JSON próprio no mockup: a resposta da receita tem a mesma forma da despesa.
const RESPOSTA_RECEITA = {
  ...lerResposta('lancar-despesa-credito.json'),
  id: ARGS.p_id,
  escopo: 'individual',
  categoria: 'Salário',
  valor_total_centavos: 750000,
  num_parcelas: 1,
  primeira_parcela_data: '2026-10-09',
  ja_existia: false,
};

beforeEach(() => {
  fetchSimulado.mockReset();
});

describe('lancarReceita', () => {
  it('faz um único POST em rpc/lancar_receita no schema api com os argumentos recebidos', async () => {
    fetchSimulado.mockImplementation(responder(200, RESPOSTA_RECEITA));

    await lancarReceita(ARGS);

    const reqs = requisicoesRest();
    expect(reqs).toHaveLength(1);
    expect(reqs[0].metodo).toBe('POST');
    expect(reqs[0].url.pathname).toBe('/rest/v1/rpc/lancar_receita');
    expect(reqs[0].cabecalhos.get('Content-Profile')).toBe('api');
    expect(reqs[0].corpo).toEqual(ARGS);
  });

  it('devolve a resposta do servidor como veio', async () => {
    fetchSimulado.mockImplementation(responder(200, RESPOSTA_RECEITA));

    await expect(lancarReceita(ARGS)).resolves.toEqual(RESPOSTA_RECEITA);
  });

  it('usa o p_id de quem chama, sem gerar outro (reenvio idempotente)', async () => {
    fetchSimulado.mockImplementation(responder(200, RESPOSTA_RECEITA));

    await lancarReceita(ARGS);
    await lancarReceita(ARGS);

    const ids = requisicoesRest().map((r) => r.corpo?.p_id);
    expect(ids).toEqual([ARGS.p_id, ARGS.p_id]);
  });

  it('erro de rede rejeita com { tipo: "rede" }', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(lancarReceita(ARGS)).rejects.toEqual({ tipo: 'rede' });
  });

  it('503 rejeita com { tipo: "indisponivel" }', async () => {
    fetchSimulado.mockImplementation(responder(503, lerResposta('erro-servico.json')));

    await expect(lancarReceita(ARGS)).rejects.toEqual({ tipo: 'indisponivel' });
  });

  it('registro_invalido rejeita com o erro de regra traduzido', async () => {
    fetchSimulado.mockImplementation(responder(400, lerResposta('erro-registro-invalido.json')));

    await expect(lancarReceita(ARGS)).rejects.toEqual({ tipo: 'regra', codigo: 'registro_invalido' });
  });

  it('valor_invalido rejeita com o erro de regra traduzido', async () => {
    fetchSimulado.mockImplementation(
      responder(400, { code: 'P0001', message: 'valor_invalido', details: null, hint: null }),
    );

    await expect(lancarReceita(ARGS)).rejects.toEqual({ tipo: 'regra', codigo: 'valor_invalido' });
  });

  it('não usa a fila nem o IndexedDB (receita nunca fica guardada no aparelho)', () => {
    const fonte = readFileSync(new URL('./lancarReceita.ts', import.meta.url), 'utf8');
    expect(fonte).not.toMatch(/fila/);
    expect(fonte).not.toMatch(/idb-keyval|indexedDB/i);
  });
});
