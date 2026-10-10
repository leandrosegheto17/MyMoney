import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lerResposta } from '../../../test/apoio/fetchSimulado';

const { lancarDespesa, sessao } = vi.hoisted(() => ({
  lancarDespesa: vi.fn(),
  sessao: { dono: '00000000-0000-4000-8000-0000000000a1' as string | null, situacao: 'valida' as string },
}));

vi.mock('../comandos/lancarDespesa', () => ({ lancarDespesa }));
vi.mock('../sessao', () => ({
  obterSessao: vi.fn(async () => (sessao.dono ? { user: { id: sessao.dono } } : null)),
  garantirSessaoValida: vi.fn(async () => (sessao.dono ? sessao.situacao : 'sem-sessao')),
}));

const A = '00000000-0000-4000-8000-0000000000a1';
const B = '00000000-0000-4000-8000-0000000000b1';
const EXIBICAO = { categoria_nome: 'Mercado', forma_nome: 'Pix Nubank' };
const ARGS = {
  p_valor_centavos: 4590,
  p_categoria_id: '00000000-0000-4000-8000-000000000401',
  p_forma_id: '00000000-0000-4000-8000-000000000301',
  p_parcelas: 1,
  p_data: '2026-10-09',
  p_descricao: 'Feira',
};

async function carregar() {
  vi.resetModules();
  const { fila } = await import('./fila');
  const { iniciarEnvioAutomatico } = await import('./envioAutomatico');
  return { fila, iniciarEnvioAutomatico };
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  lancarDespesa.mockReset();
  lancarDespesa.mockResolvedValue(lerResposta('lancar-despesa-credito.json'));
  sessao.dono = A;
  sessao.situacao = 'valida';
});

describe('envio automático com a fila real', () => {
  it('sessão revogada guarda a fila; no login do mesmo membro o item é enviado', async () => {
    const { fila, iniciarEnvioAutomatico } = await carregar();
    await fila.enfileirar(ARGS, EXIBICAO);

    sessao.situacao = 'revogada';
    let parar = iniciarEnvioAutomatico({ intervaloMs: 30_000 });
    await vi.waitFor(async () => expect(await fila.listar()).toHaveLength(1));
    parar();
    expect(lancarDespesa).not.toHaveBeenCalled();

    sessao.situacao = 'valida';
    parar = iniciarEnvioAutomatico({ intervaloMs: 30_000 });
    await vi.waitFor(() => expect(lancarDespesa).toHaveBeenCalledTimes(1));
    await vi.waitFor(async () => expect(await fila.listar()).toHaveLength(0));
    parar();
  });

  it('login de outro membro não envia o item do primeiro e não o lista', async () => {
    const { fila, iniciarEnvioAutomatico } = await carregar();
    await fila.enfileirar(ARGS, EXIBICAO);

    sessao.dono = B;
    const parar = iniciarEnvioAutomatico({ intervaloMs: 30_000 });
    await new Promise((r) => setTimeout(r, 30));
    parar();

    expect(lancarDespesa).not.toHaveBeenCalled();
    expect(await fila.listar()).toEqual([]);

    sessao.dono = A;
    expect(await fila.listar()).toHaveLength(1);
  });
});
