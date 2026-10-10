import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { lancarDespesa, sessao } = vi.hoisted(() => ({
  lancarDespesa: vi.fn(),
  sessao: { dono: 'dono-a' as string | null },
}));

vi.mock('../comandos/lancarDespesa', () => ({ lancarDespesa }));
vi.mock('../sessao', () => ({
  obterSessao: vi.fn(async () => (sessao.dono ? { user: { id: sessao.dono } } : null)),
}));

const A = '00000000-0000-4000-8000-0000000000a1';
const B = '00000000-0000-4000-8000-0000000000b1';

function args(descricao: string) {
  return {
    p_valor_centavos: 1250,
    p_categoria_id: '00000000-0000-4000-8000-000000000411',
    p_forma_id: '00000000-0000-4000-8000-000000000301',
    p_parcelas: 1,
    p_data: '2026-10-09',
    p_descricao: descricao,
  };
}

const EXIBICAO = { categoria_nome: 'Almoço/Alimentação fora', forma_nome: 'Pix Nubank' };
const ERRO_REGRA = { tipo: 'regra', codigo: 'categoria_arquivada' };

async function carregarFila() {
  vi.resetModules();
  return (await import('./fila')).fila;
}

async function falharTudo(fila: Awaited<ReturnType<typeof carregarFila>>) {
  lancarDespesa.mockRejectedValue(ERRO_REGRA);
  await fila.esvaziar();
  lancarDespesa.mockReset();
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  lancarDespesa.mockReset();
  sessao.dono = A;
});

describe('fila.reativarFalhas', () => {
  it('volta os itens com falha do dono atual para "aguardando" e limpa o motivo', async () => {
    const fila = await carregarFila();
    await fila.enfileirar(args('Padaria'), EXIBICAO);
    await fila.enfileirar(args('Feira'), EXIBICAO);
    await falharTudo(fila);
    expect((await fila.listar()).map((i) => i.situacao)).toEqual(['falhou', 'falhou']);

    await fila.reativarFalhas();

    const itens = await fila.listar();
    expect(itens.map((i) => i.situacao)).toEqual(['aguardando', 'aguardando']);
    itens.forEach((i) => expect(i.motivo).toBeUndefined());
  });

  it('não mexe nos itens de outro dono', async () => {
    const fila = await carregarFila();
    sessao.dono = B;
    await fila.enfileirar(args('Do B'), EXIBICAO);
    await falharTudo(fila);

    sessao.dono = A;
    await fila.enfileirar(args('Do A'), EXIBICAO);
    await falharTudo(fila);

    await fila.reativarFalhas();
    expect((await fila.listar()).map((i) => i.situacao)).toEqual(['aguardando']);

    sessao.dono = B;
    const doB = await fila.listar();
    expect(doB).toHaveLength(1);
    expect(doB[0].situacao).toBe('falhou');
    expect(doB[0].motivo).toBe('categoria_arquivada');
  });

  it('não envia nada sozinha', async () => {
    const fila = await carregarFila();
    await fila.enfileirar(args('Padaria'), EXIBICAO);
    await falharTudo(fila);

    await fila.reativarFalhas();

    expect(lancarDespesa).not.toHaveBeenCalled();
  });

  it('mantém o mesmo id e p_id (o reenvio continua idempotente)', async () => {
    const fila = await carregarFila();
    const item = await fila.enfileirar(args('Padaria'), EXIBICAO);
    await falharTudo(fila);

    await fila.reativarFalhas();

    const [depois] = await fila.listar();
    expect(depois.id).toBe(item.id);
    expect(depois.args.p_id).toBe(item.args.p_id);
    expect(depois.dono).toBe(A);
  });

  it('sem sessão, não reativa nada', async () => {
    const fila = await carregarFila();
    await fila.enfileirar(args('Padaria'), EXIBICAO);
    await falharTudo(fila);

    sessao.dono = null;
    await fila.reativarFalhas().catch(() => undefined);

    sessao.dono = A;
    expect((await fila.listar())[0].situacao).toBe('falhou');
  });

  it('avisa os assinantes da mudança', async () => {
    const fila = await carregarFila();
    await fila.enfileirar(args('Padaria'), EXIBICAO);
    await falharTudo(fila);
    const ouvinte = vi.fn();
    const cancelar = fila.assinar(ouvinte);

    await fila.reativarFalhas();

    expect(ouvinte).toHaveBeenCalled();
    cancelar();
  });
});
