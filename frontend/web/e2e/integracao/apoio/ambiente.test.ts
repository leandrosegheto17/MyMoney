import { describe, expect, it } from 'vitest';
import { lerAmbienteIntegracao } from './ambiente';

const TESTE = {
  TESTE_EMAIL_A: 'a@exemplo.test',
  TESTE_EMAIL_B: 'b@exemplo.test',
  TESTE_EMAIL_SEM_MEMBRO: 'sem-membro@exemplo.test',
  TESTE_SENHA: 'senha-local-de-teste',
};

function env(parcial: Record<string, string | undefined>): Record<string, string | undefined> {
  return { ...TESTE, ...parcial };
}

describe('lerAmbienteIntegracao', () => {
  it('aceita o Supabase local em 127.0.0.1 e em localhost', () => {
    for (const url of ['http://127.0.0.1:54321', 'http://localhost:54321']) {
      expect(lerAmbienteIntegracao(env({ VITE_SUPABASE_URL: url })).supabaseUrl).toBe(url);
    }
  });

  it('recusa URL de projeto hospedado', () => {
    expect(() => lerAmbienteIntegracao(env({ VITE_SUPABASE_URL: 'https://x.supabase.co' }))).toThrow(
      /VITE_SUPABASE_URL/,
    );
  });

  it('recusa host que só começa ou termina parecido com localhost', () => {
    for (const url of [
      'http://localhost.exemplo.com:54321',
      'http://127.0.0.1.exemplo.com',
      'http://exemplo.com/127.0.0.1',
      'http://localhost@exemplo.com',
    ]) {
      expect(() => lerAmbienteIntegracao(env({ VITE_SUPABASE_URL: url })), url).toThrow(/VITE_SUPABASE_URL/);
    }
  });

  it('recusa URL ausente ou inválida', () => {
    expect(() => lerAmbienteIntegracao(env({ VITE_SUPABASE_URL: undefined }))).toThrow(/VITE_SUPABASE_URL/);
    expect(() => lerAmbienteIntegracao(env({ VITE_SUPABASE_URL: 'não é url' }))).toThrow(/VITE_SUPABASE_URL/);
  });

  it('exige cada variável TESTE_* com o nome dela no erro', () => {
    for (const nome of Object.keys(TESTE)) {
      expect(
        () => lerAmbienteIntegracao(env({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', [nome]: undefined })),
        nome,
      ).toThrow(new RegExp(nome));
    }
  });
});
