import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarFetchSimulado, json, rotasAuth, sessaoDoAuth, type Rota } from '../../test/apoio/fetchSimulado';

let simulado: ReturnType<typeof criarFetchSimulado>;

async function carregar(...rotasExtras: Rota[]) {
  simulado = criarFetchSimulado(...rotasExtras, rotasAuth);
  vi.stubGlobal('fetch', simulado.fetch);
  vi.resetModules();
  return import('./sessao');
}

const ehRenovacao = (url: URL) =>
  url.pathname.endsWith('/auth/v1/token') && url.searchParams.get('grant_type') === 'refresh_token';
const ehLogin = (url: URL) =>
  url.pathname.endsWith('/auth/v1/token') && url.searchParams.get('grant_type') === 'password';

/** Login devolve uma sessão que expira em `segundos`. */
const loginExpiraEm =
  (segundos: number): Rota =>
  ({ url }) =>
    ehLogin(url) ? json({ ...sessaoDoAuth(), expires_in: segundos, expires_at: Math.floor(Date.now() / 1000) + segundos }) : undefined;

const renovacoes = () => simulado.chamadas.filter((c) => ehRenovacao(c.url));

function tokenGuardado(): string | null {
  for (let i = 0; i < localStorage.length; i++) {
    const chave = localStorage.key(i)!;
    if (/^sb-.+-auth-token$/.test(chave)) return localStorage.getItem(chave);
  }
  return null;
}

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-falsa');
  vi.stubEnv('VITE_MODO_COMPARACAO', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('garantirSessaoValida', () => {
  it('sem sessão devolve sem-sessao e não chama o Auth', async () => {
    const { garantirSessaoValida } = await carregar();

    expect(await garantirSessaoValida()).toBe('sem-sessao');
    expect(renovacoes()).toHaveLength(0);
  });

  it('sessão longe de expirar devolve valida sem renovar', async () => {
    const { entrar, garantirSessaoValida } = await carregar(loginExpiraEm(3600));
    await entrar('leandro@exemplo.com', 'senha-de-teste');

    expect(await garantirSessaoValida()).toBe('valida');
    expect(renovacoes()).toHaveLength(0);
  });

  it('token a 30 s de expirar é renovado antes de responder valida', async () => {
    const { entrar, garantirSessaoValida } = await carregar(loginExpiraEm(30));
    await entrar('leandro@exemplo.com', 'senha-de-teste');

    expect(await garantirSessaoValida()).toBe('valida');
    expect(renovacoes().length).toBeGreaterThanOrEqual(1);
  });

  it('renovação sem rede devolve rede e não apaga a sessão guardada', async () => {
    const renovarSemRede: Rota = ({ url }) => {
      if (ehRenovacao(url)) throw new TypeError('Failed to fetch');
      return undefined;
    };
    const { entrar, garantirSessaoValida } = await carregar(renovarSemRede, loginExpiraEm(30));
    await entrar('leandro@exemplo.com', 'senha-de-teste');

    expect(await garantirSessaoValida()).toBe('rede');
    expect(tokenGuardado()).not.toBeNull();
  });

  it('refresh token revogado devolve revogada', async () => {
    const renovarRevogado: Rota = ({ url }) =>
      ehRenovacao(url)
        ? json(
            {
              code: 'refresh_token_not_found',
              error_code: 'refresh_token_not_found',
              msg: 'Invalid Refresh Token: Refresh Token Not Found',
            },
            400,
          )
        : undefined;
    const { entrar, garantirSessaoValida } = await carregar(renovarRevogado, loginExpiraEm(30));
    await entrar('leandro@exemplo.com', 'senha-de-teste');

    expect(await garantirSessaoValida()).toBe('revogada');
  });
});
