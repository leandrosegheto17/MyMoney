import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from './index';
import { manterAcordado } from './manter-acordado';

const URL_FALSA = 'https://x.supabase.co';
const CHAVE_FALSA = 'chave-falsa';

function resposta(status: number): Response {
  return { ok: status >= 200 && status < 300, status } as Response;
}

function dependencias() {
  return {
    buscar: vi.fn<(url: string, init: RequestInit) => Promise<Response>>(),
    esperar: vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined),
    log: vi.fn<(nivel: 'info' | 'erro', dados: Record<string, unknown>) => void>(),
  };
}

describe('manterAcordado', () => {
  it('sucesso na primeira tentativa: uma chamada POST ao rpc/ping com a chave anon', async () => {
    const dep = dependencias();
    dep.buscar.mockResolvedValue(resposta(200));

    await manterAcordado({ url: URL_FALSA, chaveAnon: CHAVE_FALSA }, dep);

    expect(dep.buscar).toHaveBeenCalledTimes(1);
    const [url, init] = dep.buscar.mock.calls[0]!;
    expect(url).toBe('https://x.supabase.co/rest/v1/rpc/ping');
    expect(init.method).toBe('POST');
    const cabecalhos = new Headers(init.headers);
    expect(cabecalhos.get('apikey')).toBe(CHAVE_FALSA);
    expect(cabecalhos.get('Authorization')).toBe(`Bearer ${CHAVE_FALSA}`);
    expect(cabecalhos.get('Content-Type')).toBe('application/json');
    expect(init.body).toBe('{}');
    expect(dep.esperar).not.toHaveBeenCalled();
    expect(dep.log).toHaveBeenCalledWith('info', { tentativa: 1, status: 200 });
  });

  it('duas falhas (500 e erro de rede) e sucesso: três chamadas com espera exponencial', async () => {
    const dep = dependencias();
    dep.buscar
      .mockResolvedValueOnce(resposta(500))
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(resposta(200));

    await expect(manterAcordado({ url: URL_FALSA, chaveAnon: CHAVE_FALSA }, dep)).resolves.not.toThrow();

    expect(dep.buscar).toHaveBeenCalledTimes(3);
    expect(dep.esperar.mock.calls).toEqual([[1000], [2000]]);
    expect(dep.log).toHaveBeenCalledWith('info', { tentativa: 1, status: 500 });
    expect(dep.log).toHaveBeenCalledWith('info', { tentativa: 2, status: 'erro_rede' });
    expect(dep.log).toHaveBeenCalledWith('info', { tentativa: 3, status: 200 });
    expect(dep.log.mock.calls.some(([nivel]) => nivel === 'erro')).toBe(false);
  });

  it('três falhas: rejeita com keepalive_falhou e registra o erro', async () => {
    const dep = dependencias();
    dep.buscar.mockResolvedValue(resposta(503));

    await expect(manterAcordado({ url: URL_FALSA, chaveAnon: CHAVE_FALSA }, dep)).rejects.toThrow('keepalive_falhou');

    expect(dep.buscar).toHaveBeenCalledTimes(3);
    expect(dep.esperar).toHaveBeenCalledTimes(2);
    expect(dep.log.mock.calls.some(([nivel]) => nivel === 'erro')).toBe(true);
  });

  it('respeita o número de tentativas e a espera base informados', async () => {
    const dep = dependencias();
    dep.buscar.mockResolvedValue(resposta(500));

    await expect(manterAcordado({ url: URL_FALSA, chaveAnon: CHAVE_FALSA }, dep, 4, 10)).rejects.toThrow(
      'keepalive_falhou',
    );

    expect(dep.buscar).toHaveBeenCalledTimes(4);
    expect(dep.esperar.mock.calls).toEqual([[10], [20], [40]]);
  });

  it('nenhuma linha de log contém a URL nem a chave, nem a mensagem do erro de rede', async () => {
    const dep = dependencias();
    dep.buscar.mockRejectedValue(new TypeError(`fetch failed ${URL_FALSA}/rest/v1/rpc/ping apikey=${CHAVE_FALSA}`));

    await expect(manterAcordado({ url: URL_FALSA, chaveAnon: CHAVE_FALSA }, dep)).rejects.toThrow('keepalive_falhou');

    expect(dep.log).toHaveBeenCalled();
    for (const chamada of dep.log.mock.calls) {
      const texto = JSON.stringify(chamada);
      expect(texto).not.toContain('x.supabase.co');
      expect(texto).not.toContain(CHAVE_FALSA);
      expect(texto).not.toContain('fetch failed');
    }
  });

  it('URL com barra final não gera //rest', async () => {
    const dep = dependencias();
    dep.buscar.mockResolvedValue(resposta(200));

    await manterAcordado({ url: `${URL_FALSA}/`, chaveAnon: CHAVE_FALSA }, dep);

    expect(dep.buscar.mock.calls[0]![0]).toBe('https://x.supabase.co/rest/v1/rpc/ping');
  });
});

type Agendado = NonNullable<(typeof worker)['scheduled']>;
type Controle = Parameters<Agendado>[0];
type Ambiente = Parameters<Agendado>[1];
type Contexto = Parameters<Agendado>[2];

function contexto() {
  const waitUntil = vi.fn<(promessa: Promise<unknown>) => void>();
  return {
    waitUntil,
    ctx: { waitUntil, passThroughOnException: vi.fn() } as unknown as Contexto,
  };
}

describe('Worker (index)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exporta scheduled e não exporta fetch (sem rota HTTP)', () => {
    expect(typeof worker.scheduled).toBe('function');
    expect('fetch' in worker).toBe(false);
  });

  it('scheduled entrega o ping ao waitUntil usando os secrets do ambiente', async () => {
    const buscar = vi.fn().mockResolvedValue(resposta(200));
    vi.stubGlobal('fetch', buscar);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const { waitUntil, ctx } = contexto();
    const env = { SUPABASE_URL: URL_FALSA, SUPABASE_ANON_KEY: CHAVE_FALSA } as Ambiente;

    worker.scheduled!({} as Controle, env, ctx);

    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0]![0];
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(buscar.mock.calls[0]![0]).toBe('https://x.supabase.co/rest/v1/rpc/ping');
  });

  it('sem os secrets falha sem chamar a rede e sem expor valores', async () => {
    const buscar = vi.fn().mockResolvedValue(resposta(200));
    vi.stubGlobal('fetch', buscar);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { waitUntil, ctx } = contexto();
    const env = { SUPABASE_URL: URL_FALSA } as unknown as Ambiente;

    const executar = async () => {
      worker.scheduled!({} as Controle, env, ctx);
      await waitUntil.mock.calls[0]?.[0];
    };

    const erro = await executar().then(
      () => null,
      (e: unknown) => e,
    );
    expect(erro).toBeInstanceOf(Error);
    expect((erro as Error).message).not.toContain('x.supabase.co');
    expect(buscar).not.toHaveBeenCalled();
  });
});

describe('wrangler.toml', () => {
  const texto = readFileSync(fileURLToPath(new URL('../wrangler.toml', import.meta.url)), 'utf8');
  const linhas = texto.split(/\r?\n/).filter((l) => !l.trim().startsWith('#'));

  it('agenda o cron diário às 09:00 UTC', () => {
    expect(texto).toContain('crons = ["0 9 * * *"]');
  });

  it('desliga o workers.dev', () => {
    expect(linhas.some((l) => /^\s*workers_dev\s*=\s*false\s*$/.test(l))).toBe(true);
  });

  it('não declara rota', () => {
    expect(linhas.some((l) => /^\s*(\[\[?\s*)?routes?\b/.test(l))).toBe(false);
  });

  it('não guarda URL nem chave como variável comum', () => {
    expect(linhas.some((l) => /^\s*SUPABASE_(URL|ANON_KEY)\s*=/.test(l))).toBe(false);
  });
});
