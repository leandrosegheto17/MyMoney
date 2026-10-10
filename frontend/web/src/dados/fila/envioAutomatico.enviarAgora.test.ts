import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enviarAgora } from './envioAutomatico';

const { fila, garantirSessaoValida, ordem } = vi.hoisted(() => {
  const ordem: string[] = [];
  return {
    ordem,
    garantirSessaoValida: vi.fn(async () => {
      ordem.push('garantirSessaoValida');
      return 'valida' as 'valida' | 'rede' | 'revogada' | 'sem-sessao';
    }),
    fila: {
      esvaziar: vi.fn(async () => {
        ordem.push('esvaziar');
      }),
      listar: vi.fn(async () => []),
      assinar: vi.fn(() => () => undefined),
    },
  };
});

vi.mock('./fila', () => ({ fila }));
vi.mock('../sessao', () => ({ garantirSessaoValida }));

beforeEach(() => {
  ordem.length = 0;
  vi.clearAllMocks();
});

describe('enviarAgora', () => {
  it('com sessão válida, garante a sessão antes de esvaziar a fila', async () => {
    await enviarAgora();
    expect(fila.esvaziar).toHaveBeenCalledTimes(1);
    expect(ordem).toEqual(['garantirSessaoValida', 'esvaziar']);
  });

  it.each(['rede', 'revogada', 'sem-sessao'] as const)('com sessão "%s", não envia', async (estado) => {
    garantirSessaoValida.mockResolvedValueOnce(estado);
    await enviarAgora();
    expect(fila.esvaziar).not.toHaveBeenCalled();
  });

  it('só resolve depois que a rodada termina', async () => {
    let terminar: () => void = () => undefined;
    fila.esvaziar.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          terminar = resolve;
        }),
    );
    let resolvida = false;
    const rodada = enviarAgora().then(() => {
      resolvida = true;
    });
    await vi.waitFor(() => expect(fila.esvaziar).toHaveBeenCalled());
    expect(resolvida).toBe(false);
    terminar();
    await rodada;
    expect(resolvida).toBe(true);
  });

  it('funciona sem iniciarEnvioAutomatico (chamada direta do "Tentar agora")', async () => {
    await enviarAgora();
    await enviarAgora();
    expect(garantirSessaoValida).toHaveBeenCalledTimes(2);
    expect(fila.esvaziar).toHaveBeenCalledTimes(2);
  });
});
