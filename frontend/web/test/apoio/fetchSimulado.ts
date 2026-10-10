import { readFileSync } from 'node:fs';
import { vi } from 'vitest';

export type Chamada = { url: URL; metodo: string; cabecalhos: Headers; corpo: unknown };
export type Rota = (chamada: Chamada) => Response | Promise<Response> | undefined;

const RESPOSTAS = new URL('../../../../.md/mockup/respostas/', import.meta['url']);

/** Lê uma resposta de `.md/mockup/respostas/` (fonte única das fixtures). */
export function lerResposta<T = unknown>(nome: string): T {
  return JSON.parse(readFileSync(new URL(nome, RESPOSTAS), 'utf8')) as T;
}

export const USUARIO = lerResposta<{ id: string; email: string }>('auth-usuario.json');

export function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function sessaoDoAuth() {
  return {
    access_token: 'token-de-acesso-falso',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'token-de-renovacao-falso',
    user: USUARIO,
  };
}

/** Rotas padrão do Auth para os testes de sessão (sem rede real). */
export const rotasAuth: Rota = ({ url, metodo }) => {
  if (url.pathname.endsWith('/auth/v1/token') && metodo === 'POST') return json(sessaoDoAuth());
  if (url.pathname.endsWith('/auth/v1/logout')) return new Response(null, { status: 204 });
  if (url.pathname.endsWith('/auth/v1/recover')) return json({});
  if (url.pathname.endsWith('/auth/v1/user')) return json(USUARIO);
  return undefined;
};

/**
 * `fetch` falso: registra cada chamada e responde pela primeira rota que devolver algo.
 * Sem rota: 404, para o teste falhar de forma visível.
 */
export function criarFetchSimulado(...rotas: Rota[]) {
  const chamadas: Chamada[] = [];
  const fn = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(entrada, init);
    const texto = req.method === 'GET' || req.method === 'HEAD' ? '' : await req.text();
    let corpo: unknown = texto;
    try {
      corpo = texto ? JSON.parse(texto) : undefined;
    } catch {
      /* corpo não JSON fica como texto */
    }
    const chamada: Chamada = { url: new URL(req.url), metodo: req.method, cabecalhos: req.headers, corpo };
    chamadas.push(chamada);
    for (const rota of rotas) {
      const resposta = await rota(chamada);
      if (resposta) return resposta;
    }
    return json({ message: 'sem rota no fetch simulado' }, 404);
  });
  return {
    fetch: fn as unknown as typeof fetch,
    chamadas,
    chamadasA: (trecho: string) => chamadas.filter((c) => c.url.pathname.includes(trecho)),
  };
}
