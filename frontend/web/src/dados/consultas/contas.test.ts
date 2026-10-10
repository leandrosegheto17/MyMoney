import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buscarConta, buscarContas } from './contas';

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
    new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }),
  );

function requisicoesRest() {
  return fetchSimulado.mock.calls
    .map(([entrada, init]) => ({
      url: new URL(String(entrada)),
      metodo: (init?.method ?? 'GET').toUpperCase(),
      cabecalhos: new Headers(init?.headers),
    }))
    .filter((r) => r.url.pathname.startsWith('/rest/v1/'));
}

const ID_NUBANK = '00000000-0000-4000-8000-000000000201';

beforeEach(() => {
  fetchSimulado.mockReset();
});

describe('buscarContas', () => {
  it('faz GET em /rest/v1/contas?select=* no esquema api e devolve a lista inteira', async () => {
    fetchSimulado.mockImplementation(responder(200, lerResposta('contas.json')));

    const contas = await buscarContas();

    expect(contas).toEqual(lerResposta('contas.json'));
    const [req] = requisicoesRest();
    expect(req.metodo).toBe('GET');
    expect(req.url.pathname).toBe('/rest/v1/contas');
    expect(req.url.searchParams.get('select')).toBe('*');
    expect(req.cabecalhos.get('Accept-Profile')).toBe('api');
  });

  it('não filtra as arquivadas (a tela decide o que mostrar)', async () => {
    const comArquivada = [
      ...(lerResposta('contas.json') as object[]),
      { id: '00000000-0000-4000-8000-000000000209', nome: 'Antiga', saldo_inicial_centavos: 0, saldo_centavos: 0, arquivada: true },
    ];
    fetchSimulado.mockImplementation(responder(200, comArquivada));

    expect(await buscarContas()).toHaveLength(3);
    expect(requisicoesRest()[0].url.searchParams.has('arquivada')).toBe(false);
  });

  it('503 vira indisponivel', async () => {
    fetchSimulado.mockImplementation(responder(503, lerResposta('erro-servico.json')));
    await expect(buscarContas()).rejects.toEqual({ tipo: 'indisponivel' });
  });

  it('falha de rede vira rede', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(buscarContas()).rejects.toEqual({ tipo: 'rede' });
  });
});

describe('buscarConta', () => {
  it('envia id=eq.<id> e devolve a linha da conta', async () => {
    fetchSimulado.mockImplementation(responder(200, lerResposta('conta-nubank.json')));

    const conta = await buscarConta(ID_NUBANK);

    expect(conta).toEqual((lerResposta('conta-nubank.json') as unknown[])[0]);
    const [req] = requisicoesRest();
    expect(req.url.pathname).toBe('/rest/v1/contas');
    expect(req.url.searchParams.get('id')).toBe(`eq.${ID_NUBANK}`);
    expect(req.cabecalhos.get('Accept-Profile')).toBe('api');
  });

  it('lista vazia (não existe ou não é sua) vira registro_invalido', async () => {
    fetchSimulado.mockImplementation(responder(200, []));
    await expect(buscarConta(ID_NUBANK)).rejects.toEqual({ tipo: 'regra', codigo: 'registro_invalido' });
  });

  it('id que não é uuid vira registro_invalido sem nenhuma requisição', async () => {
    await expect(buscarConta('abc')).rejects.toEqual({ tipo: 'regra', codigo: 'registro_invalido' });
    expect(requisicoesRest()).toHaveLength(0);
  });

  it('503 vira indisponivel', async () => {
    fetchSimulado.mockImplementation(responder(503, lerResposta('erro-servico.json')));
    await expect(buscarConta(ID_NUBANK)).rejects.toEqual({ tipo: 'indisponivel' });
  });

  it('falha de rede vira rede', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(buscarConta(ID_NUBANK)).rejects.toEqual({ tipo: 'rede' });
  });
});
