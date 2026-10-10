import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const URL_SUPABASE = 'http://127.0.0.1:54321';

const usuario = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../../.md/mockup/respostas/auth-usuario.json', import.meta.url)), 'utf8'),
);

const base64url = (obj: object) =>
  btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

function tokenDeTeste() {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({ sub: usuario.id, exp, role: 'authenticated' })}.assinatura`;
}

const fetchSimulado = vi.fn(async (entrada: RequestInfo | URL) => {
  const url = String(entrada instanceof Request ? entrada.url : entrada);
  if (url.includes('/auth/v1/user')) {
    return new Response(JSON.stringify(usuario), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } });
});

async function carregarSessao() {
  vi.resetModules();
  return import('./sessao');
}

function irPara(caminhoComHash: string) {
  window.history.replaceState(null, '', caminhoComHash);
}

const chamadasAoAuth = () => fetchSimulado.mock.calls.filter(([u]) => String(u).includes('/auth/v1/'));

describe('estadoRecuperacao', () => {
  beforeEach(() => {
    fetchSimulado.mockClear();
    vi.stubGlobal('fetch', fetchSimulado);
    vi.stubEnv('VITE_SUPABASE_URL', URL_SUPABASE);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-falsa');
    vi.stubEnv('VITE_MODO_COMPARACAO', '');
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    irPara('/');
  });

  it('URL com otp_expired → expirado', async () => {
    irPara(
      '/redefinir-senha#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
    );
    const { estadoRecuperacao } = await carregarSessao();

    await expect(estadoRecuperacao()).resolves.toBe('expirado');
  });

  it('hash de recuperação válido → pronta', async () => {
    const token = tokenDeTeste();
    irPara(
      `/redefinir-senha#access_token=${token}&expires_in=3600&refresh_token=refresh-de-teste&token_type=bearer&type=recovery`,
    );
    const { estadoRecuperacao } = await carregarSessao();

    await expect(estadoRecuperacao()).resolves.toBe('pronta');
  });

  it('sem nada na URL → sem_link', async () => {
    irPara('/redefinir-senha');
    const { estadoRecuperacao } = await carregarSessao();

    await expect(estadoRecuperacao()).resolves.toBe('sem_link');
  });

  it('modo sem-sessao → sem_link, sem nenhuma chamada ao Auth', async () => {
    vi.stubEnv('VITE_MODO_COMPARACAO', 'sem-sessao');
    irPara('/redefinir-senha#error=access_denied&error_code=otp_expired');
    const { estadoRecuperacao } = await carregarSessao();

    await expect(estadoRecuperacao()).resolves.toBe('sem_link');
    expect(chamadasAoAuth()).toHaveLength(0);
  });

  it('o token do link não fica na URL depois da leitura', async () => {
    const token = tokenDeTeste();
    irPara(`/redefinir-senha#access_token=${token}&expires_in=3600&refresh_token=r&token_type=bearer&type=recovery`);
    const { estadoRecuperacao } = await carregarSessao();

    await estadoRecuperacao();
    expect(window.location.href).not.toContain(token);
  });
});
