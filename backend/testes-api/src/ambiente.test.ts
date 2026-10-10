import { describe, expect, it } from 'vitest';
import { lerAmbiente } from './ambiente';

const base = {
  SUPABASE_ANON_KEY: 'chave-anon-local',
  TESTE_EMAIL_A: 'leandro@exemplo.com',
  TESTE_EMAIL_B: 'ana@exemplo.com',
  TESTE_EMAIL_SEM_MEMBRO: 'sem.membro@exemplo.com',
  TESTE_SENHA: 'senha-local-de-teste',
};

describe('lerAmbiente', () => {
  it('recusa a URL da produção', () => {
    expect(() => lerAmbiente({ ...base, SUPABASE_URL: 'https://xrcxbzrglndetrrhavhc.supabase.co' })).toThrow();
  });

  it('recusa qualquer host que não seja local', () => {
    expect(() => lerAmbiente({ ...base, SUPABASE_URL: 'http://192.168.0.10:54321' })).toThrow();
    expect(() => lerAmbiente({ ...base, SUPABASE_URL: 'http://localhost.exemplo.com:54321' })).toThrow();
  });

  it('recusa quando a URL não foi informada', () => {
    expect(() => lerAmbiente({ ...base })).toThrow();
  });

  it('aceita 127.0.0.1', () => {
    expect(() => lerAmbiente({ ...base, SUPABASE_URL: 'http://127.0.0.1:54321' })).not.toThrow();
  });

  it('aceita localhost', () => {
    expect(() => lerAmbiente({ ...base, SUPABASE_URL: 'http://localhost:54321' })).not.toThrow();
  });
});
