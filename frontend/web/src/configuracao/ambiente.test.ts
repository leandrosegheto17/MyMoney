import { describe, expect, it } from 'vitest';
import { lerAmbiente } from './ambiente';

function base64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function jwt(payload: Record<string, unknown>): string {
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.assinatura-falsa`;
}

const CHAVE_ANON = jwt({ iss: 'supabase', role: 'anon' });

function env(parcial: Record<string, string | undefined>) {
  return parcial as unknown as ImportMetaEnv;
}

function capturarErro(fn: () => unknown): Error {
  try {
    fn();
  } catch (e) {
    return e as Error;
  }
  throw new Error('era esperado que lançasse');
}

describe('lerAmbiente', () => {
  it('aceita URL https e chave anon', () => {
    const r = lerAmbiente(env({ VITE_SUPABASE_URL: 'https://abcd.supabase.co', VITE_SUPABASE_ANON_KEY: CHAVE_ANON }));
    expect(r).toEqual({ supabaseUrl: 'https://abcd.supabase.co', supabaseAnonKey: CHAVE_ANON });
  });

  it('aceita http em localhost e 127.0.0.1', () => {
    for (const url of ['http://localhost:54321', 'http://127.0.0.1:54321']) {
      const r = lerAmbiente(env({ VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: CHAVE_ANON }));
      expect(r.supabaseUrl).toBe(url);
    }
  });

  it('lança com o nome da variável quando a URL falta', () => {
    expect(() => lerAmbiente(env({ VITE_SUPABASE_ANON_KEY: CHAVE_ANON }))).toThrow(/VITE_SUPABASE_URL/);
  });

  it('lança quando a URL é inválida', () => {
    expect(() => lerAmbiente(env({ VITE_SUPABASE_URL: 'não é url', VITE_SUPABASE_ANON_KEY: CHAVE_ANON }))).toThrow(
      /VITE_SUPABASE_URL/,
    );
  });

  it('recusa http fora de localhost', () => {
    expect(() =>
      lerAmbiente(env({ VITE_SUPABASE_URL: 'http://abcd.supabase.co', VITE_SUPABASE_ANON_KEY: CHAVE_ANON })),
    ).toThrow(/VITE_SUPABASE_URL/);
  });

  it('lança quando a chave está vazia ou falta', () => {
    expect(() =>
      lerAmbiente(env({ VITE_SUPABASE_URL: 'https://abcd.supabase.co', VITE_SUPABASE_ANON_KEY: '' })),
    ).toThrow(/VITE_SUPABASE_ANON_KEY/);
    expect(() => lerAmbiente(env({ VITE_SUPABASE_URL: 'https://abcd.supabase.co' }))).toThrow(/VITE_SUPABASE_ANON_KEY/);
  });

  it('recusa chave secreta sb_secret_', () => {
    expect(() =>
      lerAmbiente(env({ VITE_SUPABASE_URL: 'https://abcd.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_secret_x' })),
    ).toThrow(/VITE_SUPABASE_ANON_KEY/);
  });

  it('recusa JWT com role service_role', () => {
    const chave = jwt({ iss: 'supabase', role: 'service_role' });
    expect(() =>
      lerAmbiente(env({ VITE_SUPABASE_URL: 'https://abcd.supabase.co', VITE_SUPABASE_ANON_KEY: chave })),
    ).toThrow(/VITE_SUPABASE_ANON_KEY/);
  });

  it('a mensagem de erro não contém o valor da chave', () => {
    const segredo = 'sb_secret_valor-que-nao-pode-vazar';
    const erro = capturarErro(() =>
      lerAmbiente(env({ VITE_SUPABASE_URL: 'https://abcd.supabase.co', VITE_SUPABASE_ANON_KEY: segredo })),
    );
    expect(erro.message).not.toContain(segredo);

    const chaveServico = jwt({ role: 'service_role', marca: 'xyz-unico' });
    const erro2 = capturarErro(() =>
      lerAmbiente(env({ VITE_SUPABASE_URL: 'https://abcd.supabase.co', VITE_SUPABASE_ANON_KEY: chaveServico })),
    );
    expect(erro2.message).not.toContain(chaveServico);
  });
});
