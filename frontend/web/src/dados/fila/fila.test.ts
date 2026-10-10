import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { createStore, values } from 'idb-keyval';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lerResposta } from '../../../test/apoio/fetchSimulado';

const { lancarDespesa, sessao } = vi.hoisted(() => ({
  lancarDespesa: vi.fn(),
  sessao: { dono: '00000000-0000-4000-8000-0000000000a1' as string | null },
}));

vi.mock('../comandos/lancarDespesa', () => ({ lancarDespesa }));
vi.mock('../sessao', () => ({
  obterSessao: vi.fn(async () => (sessao.dono ? { user: { id: sessao.dono } } : null)),
}));

const A = '00000000-0000-4000-8000-0000000000a1';
const B = '00000000-0000-4000-8000-0000000000b1';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESPOSTA = lerResposta<Record<string, unknown>>('lancar-despesa-credito.json');
const EXIBICAO = { categoria_nome: 'Mercado', forma_nome: 'Cartão de crédito XP' };

function args(descricao: string) {
  return {
    p_valor_centavos: 36000,
    p_categoria_id: '00000000-0000-4000-8000-000000000401',
    p_forma_id: '00000000-0000-4000-8000-000000000303',
    p_parcelas: 3,
    p_data: '2026-10-09',
    p_descricao: descricao,
  };
}

type Fila = Awaited<ReturnType<typeof carregarFila>>;

async function carregarFila() {
  vi.resetModules();
  return (await import('./fila')).fila;
}

const itensGuardados = () => values(createStore('mymoney-fila', 'itens'));
const descricoesEnviadas = () => lancarDespesa.mock.calls.map(([a]) => (a as { p_descricao: string }).p_descricao);
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function enfileirarTres(fila: Fila) {
  await fila.enfileirar(args('primeiro'), EXIBICAO);
  await esperar(2);
  await fila.enfileirar(args('segundo'), EXIBICAO);
  await esperar(2);
  await fila.enfileirar(args('terceiro'), EXIBICAO);
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  lancarDespesa.mockReset();
  sessao.dono = A;
});

describe('fila.enfileirar', () => {
  it('grava o item completo antes de qualquer envio, com dono, uuid v4 e data', async () => {
    lancarDespesa.mockReturnValue(new Promise(() => {}));
    const fila = await carregarFila();

    const item = await fila.enfileirar(args('Feira'), EXIBICAO);
    void fila.esvaziar();

    const [guardado] = (await itensGuardados()) as Array<{ args: Record<string, unknown>; criadoEm: unknown }>;
    expect(guardado).toMatchObject({
      id: item.id,
      dono: A,
      situacao: 'aguardando',
      exibicao: EXIBICAO,
      args: { ...args('Feira'), p_id: item.args.p_id },
    });
    expect(guardado.args.p_id).toMatch(UUID_V4);
    expect(guardado.args.p_data).toBe('2026-10-09');
    expect(typeof guardado.criadoEm).toBe('number');
  });

  it('não envia sozinho', async () => {
    const fila = await carregarFila();
    await fila.enfileirar(args('Feira'), EXIBICAO);
    expect(lancarDespesa).not.toHaveBeenCalled();
  });

  it('sem sessão recusa e não grava', async () => {
    sessao.dono = null;
    const fila = await carregarFila();

    await expect(fila.enfileirar(args('Feira'), EXIBICAO)).rejects.toBeDefined();
    expect(await itensGuardados()).toHaveLength(0);
  });

  it('o dono vem da sessão, não de quem chama', async () => {
    const fila = await carregarFila();
    await fila.enfileirar({ ...args('Feira'), dono: B } as never, EXIBICAO);
    const [guardado] = (await itensGuardados()) as Array<{ dono: string }>;
    expect(guardado.dono).toBe(A);
  });
});

describe('fila.esvaziar', () => {
  it('envia na ordem de criação, um por vez, e remove só os enviados', async () => {
    let emCurso = 0;
    let maximo = 0;
    lancarDespesa.mockImplementation(async () => {
      emCurso += 1;
      maximo = Math.max(maximo, emCurso);
      await esperar(5);
      emCurso -= 1;
      return RESPOSTA;
    });
    const fila = await carregarFila();
    await enfileirarTres(fila);

    await fila.esvaziar();

    expect(descricoesEnviadas()).toEqual(['primeiro', 'segundo', 'terceiro']);
    expect(maximo).toBe(1);
    expect(await fila.listar()).toHaveLength(0);
  });

  it('envia a chamada completa guardada, com o p_id do item', async () => {
    lancarDespesa.mockResolvedValue(RESPOSTA);
    const fila = await carregarFila();
    const item = await fila.enfileirar(args('Feira'), EXIBICAO);

    await fila.esvaziar();

    expect(lancarDespesa).toHaveBeenCalledWith({ ...args('Feira'), p_id: item.args.p_id });
  });

  it('rede no 2º para a rodada: 1º removido, 2º e 3º intactos; nova rodada envia os dois', async () => {
    lancarDespesa.mockResolvedValueOnce(RESPOSTA).mockRejectedValueOnce({ tipo: 'rede' }).mockResolvedValue(RESPOSTA);
    const fila = await carregarFila();
    await enfileirarTres(fila);

    await fila.esvaziar();

    expect(descricoesEnviadas()).toEqual(['primeiro', 'segundo']);
    const restantes = await fila.listar();
    expect(restantes.map((i) => i.args.p_descricao)).toEqual(['segundo', 'terceiro']);
    expect(restantes.map((i) => i.situacao)).toEqual(['aguardando', 'aguardando']);

    await fila.esvaziar();

    expect(descricoesEnviadas()).toEqual(['primeiro', 'segundo', 'segundo', 'terceiro']);
    expect(await fila.listar()).toHaveLength(0);
  });

  it('serviço indisponível deixa o item intacto e para', async () => {
    lancarDespesa.mockRejectedValue({ tipo: 'indisponivel' });
    const fila = await carregarFila();
    await enfileirarTres(fila);

    await fila.esvaziar();

    expect(lancarDespesa).toHaveBeenCalledTimes(1);
    expect((await fila.listar()).map((i) => i.situacao)).toEqual(['aguardando', 'aguardando', 'aguardando']);
  });

  it('rejeição de regra vira falha com o motivo e os seguintes são enviados', async () => {
    lancarDespesa.mockRejectedValueOnce({ tipo: 'regra', codigo: 'registro_invalido' }).mockResolvedValue(RESPOSTA);
    const fila = await carregarFila();
    await enfileirarTres(fila);

    await fila.esvaziar();

    expect(descricoesEnviadas()).toEqual(['primeiro', 'segundo', 'terceiro']);
    const restantes = await fila.listar();
    expect(restantes).toHaveLength(1);
    expect(restantes[0]).toMatchObject({ situacao: 'falhou', motivo: 'registro_invalido' });
    expect(restantes[0].args.p_descricao).toBe('primeiro');
  });

  it('erro desconhecido vira falha "desconhecido" e não é reenviado na rodada seguinte', async () => {
    lancarDespesa.mockRejectedValue({ tipo: 'desconhecido' });
    const fila = await carregarFila();
    await fila.enfileirar(args('Feira'), EXIBICAO);

    await fila.esvaziar();
    await fila.esvaziar();

    expect(lancarDespesa).toHaveBeenCalledTimes(1);
    expect(await fila.listar()).toEqual([expect.objectContaining({ situacao: 'falhou', motivo: 'desconhecido' })]);
  });

  it('resposta perdida: o reenvio usa o mesmo p_id e a idempotência evita duplicata', async () => {
    const gravadosNoServidor = new Set<string>();
    let perderResposta = true;
    lancarDespesa.mockImplementation(async (a: { p_id: string }) => {
      const jaExistia = gravadosNoServidor.has(a.p_id);
      gravadosNoServidor.add(a.p_id);
      if (perderResposta) {
        perderResposta = false;
        throw { tipo: 'rede' };
      }
      return { ...RESPOSTA, ja_existia: jaExistia };
    });
    const fila = await carregarFila();
    await fila.enfileirar(args('Feira'), EXIBICAO);

    await fila.esvaziar();
    expect(await fila.listar()).toHaveLength(1);

    await fila.esvaziar();

    const ids = lancarDespesa.mock.calls.map(([a]) => (a as { p_id: string }).p_id);
    expect(ids).toHaveLength(2);
    expect(ids[1]).toBe(ids[0]);
    expect(gravadosNoServidor.size).toBe(1);
    expect(await fila.listar()).toHaveLength(0);
  });

  it('duas chamadas simultâneas enviam cada item uma vez só', async () => {
    lancarDespesa.mockImplementation(async () => {
      await esperar(5);
      return RESPOSTA;
    });
    const fila = await carregarFila();
    await enfileirarTres(fila);

    await Promise.all([fila.esvaziar(), fila.esvaziar()]);

    expect(descricoesEnviadas()).toEqual(['primeiro', 'segundo', 'terceiro']);
  });
});

describe('fila e o dono dos itens', () => {
  it('item de outro membro não é enviado, nem apagado, nem listado; volta o dono e é enviado', async () => {
    lancarDespesa.mockResolvedValue(RESPOSTA);
    const fila = await carregarFila();
    await fila.enfileirar(args('Do A'), EXIBICAO);

    sessao.dono = B;
    await fila.esvaziar();

    expect(lancarDespesa).not.toHaveBeenCalled();
    expect(await fila.listar()).toEqual([]);
    expect(await itensGuardados()).toHaveLength(1);

    sessao.dono = A;
    await fila.esvaziar();

    expect(descricoesEnviadas()).toEqual(['Do A']);
    expect(await itensGuardados()).toHaveLength(0);
  });
});

describe('fila.descartar', () => {
  it('sem confirmação lança e mantém o item', async () => {
    const fila = await carregarFila();
    const item = await fila.enfileirar(args('Feira'), EXIBICAO);

    await expect(fila.descartar(item.id, {} as never)).rejects.toBeDefined();
    await expect(fila.descartar(item.id, undefined as never)).rejects.toBeDefined();

    expect(await fila.listar()).toHaveLength(1);
  });

  it('com { confirmado: true } remove', async () => {
    const fila = await carregarFila();
    const item = await fila.enfileirar(args('Feira'), EXIBICAO);

    await fila.descartar(item.id, { confirmado: true });

    expect(await fila.listar()).toHaveLength(0);
  });

  it('não descarta item de outro membro', async () => {
    const fila = await carregarFila();
    const item = await fila.enfileirar(args('Do A'), EXIBICAO);

    sessao.dono = B;
    await fila.descartar(item.id, { confirmado: true }).catch(() => undefined);

    expect(await itensGuardados()).toHaveLength(1);
  });
});

describe('fila.assinar', () => {
  it('avisa o envio com a resposta do servidor', async () => {
    lancarDespesa.mockResolvedValue(RESPOSTA);
    const fila = await carregarFila();
    const item = await fila.enfileirar(args('Feira'), EXIBICAO);
    const ouvinte = vi.fn();
    fila.assinar(ouvinte);

    await fila.esvaziar();

    expect(ouvinte).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'enviado',
        resposta: RESPOSTA,
        item: expect.objectContaining({ id: item.id }),
      }),
    );
  });

  it('cancelar a assinatura para de avisar', async () => {
    lancarDespesa.mockResolvedValue(RESPOSTA);
    const fila = await carregarFila();
    const ouvinte = vi.fn();
    const cancelar = fila.assinar(ouvinte);
    cancelar();

    await fila.enfileirar(args('Feira'), EXIBICAO);
    await fila.esvaziar();

    expect(ouvinte).not.toHaveBeenCalled();
  });
});
