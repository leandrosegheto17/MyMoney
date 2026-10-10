import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchSimulado, modoSimulado } = vi.hoisted(() => ({
  fetchSimulado: vi.fn<typeof fetch>(),
  modoSimulado: vi.fn<() => 'sessao-falsa' | 'sem-sessao' | null>(() => null),
}));

vi.mock('../modoComparacao', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../modoComparacao')>()),
  modoComparacao: () => modoSimulado(),
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

const lerResposta = (nome: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../../.md/mockup/respostas/${nome}`, import.meta.url), 'utf8'));

const responder = (status: number, corpo: unknown) => () =>
  Promise.resolve(
    new Response(corpo === undefined ? null : JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

function chamadasInicializar() {
  return fetchSimulado.mock.calls
    .map(([entrada, init]) => ({
      url: new URL(String(entrada)),
      metodo: (init?.method ?? 'GET').toUpperCase(),
      cabecalhos: new Headers(init?.headers),
    }))
    .filter((r) => r.url.pathname === '/rest/v1/rpc/inicializar_membro');
}

const USUARIO_A = '00000000-0000-4000-8000-0000000000a1';
const USUARIO_B = '00000000-0000-4000-8000-0000000000b2';

async function carregarModulo() {
  vi.resetModules();
  return import('./inicializarMembro');
}

beforeEach(() => {
  fetchSimulado.mockReset();
  modoSimulado.mockReturnValue(null);
});

describe('inicializarMembro', () => {
  it('faz POST em rpc/inicializar_membro no esquema api', async () => {
    fetchSimulado.mockImplementation(responder(204, undefined));
    const { inicializarMembro } = await carregarModulo();

    await inicializarMembro(USUARIO_A);

    const [req] = chamadasInicializar();
    expect(req.metodo).toBe('POST');
    expect(req.cabecalhos.get('Content-Profile')).toBe('api');
  });

  it('chama uma vez só por usuário na mesma carga do app, mesmo com chamadas simultâneas', async () => {
    fetchSimulado.mockImplementation(responder(204, undefined));
    const { inicializarMembro } = await carregarModulo();

    await Promise.all([inicializarMembro(USUARIO_A), inicializarMembro(USUARIO_A)]);
    await inicializarMembro(USUARIO_A);

    expect(chamadasInicializar()).toHaveLength(1);
  });

  it('chama de novo para outro usuário', async () => {
    fetchSimulado.mockImplementation(responder(204, undefined));
    const { inicializarMembro } = await carregarModulo();

    await inicializarMembro(USUARIO_A);
    await inicializarMembro(USUARIO_B);

    expect(chamadasInicializar()).toHaveLength(2);
  });

  it('falha não lança para a tela e a próxima chamada tenta de novo', async () => {
    const { inicializarMembro } = await carregarModulo();

    fetchSimulado.mockImplementation(responder(503, lerResposta('erro-servico.json')));
    await expect(inicializarMembro(USUARIO_A)).resolves.toBeUndefined();

    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(inicializarMembro(USUARIO_A)).resolves.toBeUndefined();

    fetchSimulado.mockImplementation(responder(204, undefined));
    await inicializarMembro(USUARIO_A);
    await inicializarMembro(USUARIO_A);

    expect(chamadasInicializar()).toHaveLength(3);
  });

  it('erro de regra também não lança', async () => {
    fetchSimulado.mockImplementation(responder(400, lerResposta('erro-registro-invalido.json')));
    const { inicializarMembro } = await carregarModulo();

    await expect(inicializarMembro(USUARIO_A)).resolves.toBeUndefined();
  });

  it('em sessao-falsa resolve sem nenhuma requisição', async () => {
    modoSimulado.mockReturnValue('sessao-falsa');
    const { inicializarMembro } = await carregarModulo();

    await inicializarMembro(USUARIO_A);

    expect(fetchSimulado).not.toHaveBeenCalled();
  });
});
