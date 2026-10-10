// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hostSupabaseProducao } from '../apoio/refProducao';

type Cabecalho = { key: string; value: string };
type VercelJson = {
  rewrites?: Array<{ source: string; destination: string }>;
  headers?: Array<{ source: string; headers: Cabecalho[] }>;
};

const vercel: VercelJson = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));

function cabecalho(nome: string): string {
  const bloco = vercel.headers?.find((h) => h.source === '/(.*)');
  const achado = bloco?.headers.find((h) => h.key.toLowerCase() === nome.toLowerCase());
  if (!achado) throw new Error(`cabeçalho ausente: ${nome}`);
  return achado.value;
}

function diretivasCsp(): Map<string, string[]> {
  return new Map(
    cabecalho('Content-Security-Policy')
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [nome, ...valores] = d.split(/\s+/);
        return [nome, valores] as const;
      }),
  );
}

describe('vercel.json', () => {
  it('reescreve toda rota para o index.html (SPA)', () => {
    expect(vercel.rewrites).toContainEqual({ source: '/(.*)', destination: '/index.html' });
  });

  describe('Content-Security-Policy', () => {
    const csp = diretivasCsp();

    it("default-src 'self'", () => {
      expect(csp.get('default-src')).toEqual(["'self'"]);
    });

    it("frame-ancestors 'none'", () => {
      expect(csp.get('frame-ancestors')).toEqual(["'none'"]);
    });

    it('sem unsafe-inline nem unsafe-eval em script-src e default-src', () => {
      for (const diretiva of ['script-src', 'default-src']) {
        const valores = csp.get(diretiva) ?? [];
        expect(valores, diretiva).not.toContain("'unsafe-inline'");
        expect(valores, diretiva).not.toContain("'unsafe-eval'");
      }
    });

    it("connect-src é exatamente 'self' e o Supabase de produção", () => {
      expect([...(csp.get('connect-src') ?? [])].sort()).toEqual(
        ["'self'", `https://${hostSupabaseProducao()}`].sort(),
      );
    });

    it('nenhum curinga nem host além do Supabase de produção', () => {
      const valores = [...csp.values()].flat();
      expect(valores.filter((v) => v.includes('*'))).toEqual([]);
      const hosts = valores.filter((v) => /^(https?|wss?):/.test(v));
      expect(hosts).toEqual([`https://${hostSupabaseProducao()}`]);
    });
  });

  it('HSTS com max-age de pelo menos um ano', () => {
    const valor = cabecalho('Strict-Transport-Security');
    const maxAge = Number(valor.match(/max-age=(\d+)/)?.[1]);
    expect(maxAge).toBeGreaterThanOrEqual(31536000);
  });

  it('X-Content-Type-Options: nosniff', () => {
    expect(cabecalho('X-Content-Type-Options')).toBe('nosniff');
  });

  it('Referrer-Policy: no-referrer', () => {
    expect(cabecalho('Referrer-Policy')).toBe('no-referrer');
  });

  it('Permissions-Policy restritiva', () => {
    const valor = cabecalho('Permissions-Policy');
    for (const recurso of ['camera=()', 'microphone=()', 'geolocation=()']) {
      expect(valor).toContain(recurso);
    }
  });

  it('a chave anon não está no arquivo', () => {
    const texto = readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8');
    expect(texto).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}\.|sb_(publishable|secret)_/);
  });
});
