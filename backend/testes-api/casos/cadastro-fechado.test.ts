import { describe, expect, it } from 'vitest';
import { obterAmbiente } from '../src/sessoes';

describe('auth.signup', () => {
  it('com a anon local, o cadastro é recusado com 422 signup_disabled', async () => {
    const { url, anonKey, senha } = obterAmbiente();
    const resposta = await fetch(`${url}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'cadastro-fechado@exemplo.invalid', password: senha }),
    });
    const corpo = (await resposta.json()) as { error_code?: string };
    expect(resposta.status).toBe(422);
    expect(corpo.error_code).toBe('signup_disabled');
  });
});
