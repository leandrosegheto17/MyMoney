import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { alterarDataParcela, editarLancamento, ehConfirmarDescarte, excluirLancamento } from './lancamentos';

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

const ID_GELADEIRA = '00000000-0000-4000-8000-000000000520';
const ID_PARCELA_2 = '00000000-0000-4000-8000-000000000621';
const ID_MORADIA = '00000000-0000-4000-8000-000000000403';

beforeEach(() => {
  fetchSimulado.mockReset();
});

describe('editarLancamento', () => {
  it('POST em rpc/editar_lancamento com os p_* dos campos recebidos e p_confirmar_descarte false', async () => {
    fetchSimulado.mockImplementation(responder(200, {}));

    await editarLancamento({
      id: ID_GELADEIRA,
      campos: { valorTotalCentavos: 200000, descricao: 'Geladeira inox' },
    });

    const [req] = requisicoesRest();
    expect(req.metodo).toBe('POST');
    expect(req.url.pathname).toBe('/rest/v1/rpc/editar_lancamento');
    expect(req.cabecalhos.get('Content-Profile')).toBe('api');
    expect(req.corpo).toEqual({
      p_id: ID_GELADEIRA,
      p_valor_total_centavos: 200000,
      p_descricao: 'Geladeira inox',
      p_confirmar_descarte: false,
    });
  });

  it('mapeia todos os campos do pagador para os parâmetros da função', async () => {
    fetchSimulado.mockImplementation(responder(200, {}));

    await editarLancamento({
      id: ID_GELADEIRA,
      campos: {
        valorTotalCentavos: 195000,
        categoriaId: ID_MORADIA,
        descricao: 'Geladeira nova',
        data: '2026-08-21',
        formaId: '00000000-0000-4000-8000-000000000303',
        numParcelas: 4,
      },
    });

    const [req] = requisicoesRest();
    expect(req.corpo).toEqual({
      p_id: ID_GELADEIRA,
      p_valor_total_centavos: 195000,
      p_categoria_id: ID_MORADIA,
      p_descricao: 'Geladeira nova',
      p_data: '2026-08-21',
      p_forma_id: '00000000-0000-4000-8000-000000000303',
      p_num_parcelas: 4,
      p_confirmar_descarte: false,
    });
  });

  it('não envia forma nem parcelas quando não vieram nos campos (outro membro)', async () => {
    fetchSimulado.mockImplementation(responder(200, {}));

    await editarLancamento({ id: ID_GELADEIRA, campos: { descricao: 'Geladeira' } });

    const [req] = requisicoesRest();
    expect(req.corpo).not.toHaveProperty('p_forma_id');
    expect(req.corpo).not.toHaveProperty('p_num_parcelas');
    expect(req.corpo).not.toHaveProperty('p_data');
  });

  it('confirmarDescarte: true vai como p_confirmar_descarte true', async () => {
    fetchSimulado.mockImplementation(responder(200, {}));

    await editarLancamento({
      id: ID_GELADEIRA,
      campos: { valorTotalCentavos: 200000 },
      confirmarDescarte: true,
    });

    const [req] = requisicoesRest();
    expect(req.corpo).toMatchObject({ p_confirmar_descarte: true });
  });

  it('confirmar_descarte_ajustes vira regra reconhecida por ehConfirmarDescarte', async () => {
    fetchSimulado.mockImplementation(
      responder(400, { code: 'P0001', message: 'confirmar_descarte_ajustes', details: null, hint: null }),
    );

    const erro = await editarLancamento({
      id: ID_GELADEIRA,
      campos: { valorTotalCentavos: 200000 },
    }).catch((e: unknown) => e);

    expect(erro).toEqual({ tipo: 'regra', codigo: 'confirmar_descarte_ajustes' });
    expect(ehConfirmarDescarte(erro)).toBe(true);
  });

  it('ehConfirmarDescarte é falso para outros erros', () => {
    expect(ehConfirmarDescarte({ tipo: 'regra', codigo: 'registro_invalido' })).toBe(false);
    expect(ehConfirmarDescarte({ tipo: 'rede' })).toBe(false);
    expect(ehConfirmarDescarte(undefined)).toBe(false);
  });

  it('registro_invalido é traduzido', async () => {
    fetchSimulado.mockImplementation(responder(400, lerResposta('erro-registro-invalido.json')));

    await expect(editarLancamento({ id: ID_GELADEIRA, campos: { descricao: 'x' } })).rejects.toEqual({
      tipo: 'regra',
      codigo: 'registro_invalido',
    });
  });

  it('TypeError do fetch vira { tipo: "rede" }', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(editarLancamento({ id: ID_GELADEIRA, campos: { descricao: 'x' } })).rejects.toEqual({ tipo: 'rede' });
  });
});

describe('excluirLancamento', () => {
  it('POST em rpc/excluir_lancamento com p_id', async () => {
    fetchSimulado.mockImplementation(responder(204, undefined));

    await excluirLancamento(ID_GELADEIRA);

    const [req] = requisicoesRest();
    expect(req.metodo).toBe('POST');
    expect(req.url.pathname).toBe('/rest/v1/rpc/excluir_lancamento');
    expect(req.cabecalhos.get('Content-Profile')).toBe('api');
    expect(req.corpo).toEqual({ p_id: ID_GELADEIRA });
  });

  it('registro_invalido (já excluído pelo outro membro) é traduzido', async () => {
    fetchSimulado.mockImplementation(responder(400, lerResposta('erro-registro-invalido.json')));

    await expect(excluirLancamento(ID_GELADEIRA)).rejects.toEqual({
      tipo: 'regra',
      codigo: 'registro_invalido',
    });
  });

  it('TypeError do fetch vira { tipo: "rede" }', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(excluirLancamento(ID_GELADEIRA)).rejects.toEqual({ tipo: 'rede' });
  });
});

describe('alterarDataParcela', () => {
  it('POST em rpc/alterar_data_parcela com p_parcela_id e p_data', async () => {
    fetchSimulado.mockImplementation(responder(204, undefined));

    await alterarDataParcela({ parcelaId: ID_PARCELA_2, data: '2026-11-05' });

    const [req] = requisicoesRest();
    expect(req.metodo).toBe('POST');
    expect(req.url.pathname).toBe('/rest/v1/rpc/alterar_data_parcela');
    expect(req.cabecalhos.get('Content-Profile')).toBe('api');
    expect(req.corpo).toEqual({ p_parcela_id: ID_PARCELA_2, p_data: '2026-11-05' });
  });

  it('400 com registro_invalido vira { tipo: "regra", codigo: "registro_invalido" }', async () => {
    fetchSimulado.mockImplementation(responder(400, lerResposta('erro-registro-invalido.json')));

    await expect(alterarDataParcela({ parcelaId: ID_PARCELA_2, data: '2026-11-05' })).rejects.toEqual({
      tipo: 'regra',
      codigo: 'registro_invalido',
    });
  });

  it('TypeError do fetch vira { tipo: "rede" }', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(alterarDataParcela({ parcelaId: ID_PARCELA_2, data: '2026-11-05' })).rejects.toEqual({
      tipo: 'rede',
    });
  });

  it('id de parcela que não é uuid dá registro_invalido sem requisição', async () => {
    await expect(alterarDataParcela({ parcelaId: 'abc', data: '2026-11-05' })).rejects.toEqual({
      tipo: 'regra',
      codigo: 'registro_invalido',
    });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });
});
