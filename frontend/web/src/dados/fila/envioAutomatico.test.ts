import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { iniciarEnvioAutomatico } from './envioAutomatico';

type Situacao = 'valida' | 'rede' | 'revogada' | 'sem-sessao';

const { fila, garantirSessaoValida, estado, ordem } = vi.hoisted(() => {
  const ordem: string[] = [];
  const estado = {
    itens: [] as Array<{ id: string; situacao: 'aguardando' | 'falhou' }>,
    ouvintes: [] as Array<(evento: unknown) => void>,
  };
  return {
    ordem,
    estado,
    garantirSessaoValida: vi.fn(async (): Promise<Situacao> => {
      ordem.push('garantirSessaoValida');
      return 'valida';
    }),
    fila: {
      esvaziar: vi.fn(async () => {
        ordem.push('esvaziar');
      }),
      listar: vi.fn(async () => estado.itens),
      assinar: vi.fn((cb: (evento: unknown) => void) => {
        estado.ouvintes.push(cb);
        return () => {
          estado.ouvintes = estado.ouvintes.filter((o) => o !== cb);
        };
      }),
    },
  };
});

vi.mock('./fila', () => ({ fila }));
vi.mock('../sessao', () => ({ garantirSessaoValida }));

const aguardando = { id: 'i1', situacao: 'aguardando' as const };
const falhou = { id: 'i2', situacao: 'falhou' as const };

async function emitirMudanca() {
  for (const ouvinte of estado.ouvintes) ouvinte({ tipo: 'mudou' });
  await vi.advanceTimersByTimeAsync(0);
}

function definirVisibilidade(valor: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => valor });
}

let parar: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  ordem.length = 0;
  estado.itens = [];
  estado.ouvintes = [];
  garantirSessaoValida.mockResolvedValue('valida');
});

afterEach(() => {
  parar?.();
  parar = undefined;
  vi.useRealTimers();
  definirVisibilidade('visible');
});

async function iniciar() {
  parar = iniciarEnvioAutomatico({ intervaloMs: 30_000 });
  await vi.advanceTimersByTimeAsync(0);
}

describe('iniciarEnvioAutomatico: gatilhos', () => {
  it('faz uma rodada ao iniciar', async () => {
    await iniciar();
    expect(fila.esvaziar).toHaveBeenCalledTimes(1);
  });

  it('o evento online dispara mais uma rodada', async () => {
    await iniciar();
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);
    expect(fila.esvaziar).toHaveBeenCalledTimes(2);
  });

  it('visibilitychange para visible dispara uma rodada; para hidden não', async () => {
    await iniciar();

    definirVisibilidade('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(fila.esvaziar).toHaveBeenCalledTimes(2);

    definirVisibilidade('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(fila.esvaziar).toHaveBeenCalledTimes(2);
  });
});

describe('iniciarEnvioAutomatico: intervalo de 30 s', () => {
  it('com item aguardando, dispara a cada 30 s', async () => {
    estado.itens = [aguardando];
    await iniciar();
    fila.esvaziar.mockClear();

    await vi.advanceTimersByTimeAsync(30_000);
    expect(fila.esvaziar).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fila.esvaziar).toHaveBeenCalledTimes(3);
  });

  it('para quando a fila esvazia', async () => {
    estado.itens = [aguardando];
    await iniciar();
    fila.esvaziar.mockClear();

    estado.itens = [];
    await emitirMudanca();
    await vi.advanceTimersByTimeAsync(90_000);

    expect(fila.esvaziar).not.toHaveBeenCalled();
  });

  it('volta a ligar quando entra um item aguardando', async () => {
    await iniciar();
    fila.esvaziar.mockClear();

    await vi.advanceTimersByTimeAsync(30_000);
    expect(fila.esvaziar).not.toHaveBeenCalled();

    estado.itens = [aguardando];
    await emitirMudanca();
    await vi.advanceTimersByTimeAsync(30_000);

    expect(fila.esvaziar).toHaveBeenCalled();
  });

  it('só itens com falha não ligam o intervalo', async () => {
    estado.itens = [falhou];
    await iniciar();
    fila.esvaziar.mockClear();

    await vi.advanceTimersByTimeAsync(90_000);

    expect(fila.esvaziar).not.toHaveBeenCalled();
  });
});

describe('iniciarEnvioAutomatico: sessão', () => {
  it('garante a sessão antes de esvaziar', async () => {
    await iniciar();
    expect(ordem).toEqual(['garantirSessaoValida', 'esvaziar']);
  });

  it.each(['rede', 'revogada', 'sem-sessao'] as const)('sessão "%s": não envia e não mexe na fila', async (situacao) => {
    garantirSessaoValida.mockResolvedValue(situacao);
    estado.itens = [aguardando];

    await iniciar();
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(30_000);

    expect(garantirSessaoValida).toHaveBeenCalled();
    expect(fila.esvaziar).not.toHaveBeenCalled();
  });

  it('parar() depois de sessão revogada não dá erro', async () => {
    garantirSessaoValida.mockResolvedValue('revogada');
    await iniciar();
    expect(() => parar?.()).not.toThrow();
    parar = undefined;
  });
});

describe('parar', () => {
  it('depois de parar, online e o relógio não disparam nada', async () => {
    estado.itens = [aguardando];
    await iniciar();
    parar?.();
    parar = undefined;
    fila.esvaziar.mockClear();
    garantirSessaoValida.mockClear();

    window.dispatchEvent(new Event('online'));
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(90_000);

    expect(garantirSessaoValida).not.toHaveBeenCalled();
    expect(fila.esvaziar).not.toHaveBeenCalled();
  });
});
