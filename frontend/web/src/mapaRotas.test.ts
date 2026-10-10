import { describe, it, expect } from 'vitest';
import type { RouteObject } from 'react-router';
import { mapaRotas } from './mapaRotas';

const ROTAS_DO_UX_SPEC = [
  '/entrar',
  '/redefinir-senha',
  '/',
  '/lancar',
  '/lancamentos',
  '/lancamentos/:id',
  '/fixas',
  '/fixas/nova',
  '/fixas/:id',
  '/orcamento',
  '/metas',
  '/metas/nova',
  '/metas/:id',
  '/metas/:id/editar',
  '/ajustes',
  '/ajustes/contas',
  '/ajustes/contas/nova',
  '/ajustes/contas/:id',
  '/ajustes/formas',
  '/ajustes/formas/nova',
  '/ajustes/formas/:id',
  '/ajustes/categorias',
  '/ajustes/categorias/nova',
  '/ajustes/categorias/:id',
];

type Folha = { caminho: string; rota: RouteObject };

function juntar(pai: string, filho: string): string {
  if (filho.startsWith('/')) return filho;
  const base = pai.endsWith('/') ? pai : `${pai}/`;
  return `${base}${filho}`;
}

function achatar(rotas: RouteObject[], pai = '/'): Folha[] {
  return rotas.flatMap((rota) => {
    const caminho = rota.index ? pai : rota.path !== undefined ? juntar(pai, rota.path) : pai;
    const propria: Folha[] = rota.path !== undefined || rota.index ? [{ caminho, rota }] : [];
    return [...propria, ...(rota.children ? achatar(rota.children, caminho) : [])];
  });
}

const folhas = achatar(mapaRotas);

function acharRota(caminho: string): RouteObject {
  // a rota mais interna vence: um layout com path "/" não deve esconder a rota índice
  const achada = folhas.filter((f) => f.caminho === caminho).at(-1);
  if (!achada) throw new Error(`rota ausente: ${caminho}`);
  return achada.rota;
}

describe('mapaRotas', () => {
  it.each(ROTAS_DO_UX_SPEC)('tem a rota %s', (caminho) => {
    expect(folhas.map((f) => f.caminho)).toContain(caminho);
  });

  it('tem a rota coringa da página não encontrada', () => {
    expect(folhas.some((f) => f.caminho.endsWith('*'))).toBe(true);
  });

  it.each(['/', '/lancar'])('%s é carregada sem lazy', (caminho) => {
    const rota = acharRota(caminho);
    expect(rota.lazy).toBeUndefined();
    expect(rota.Component ?? rota.element).toBeTruthy();
  });

  it.each(ROTAS_DO_UX_SPEC.filter((c) => c !== '/' && c !== '/lancar'))(
    '%s é preguiçosa',
    (caminho) => {
      expect(acharRota(caminho).lazy).toBeTypeOf('function');
    },
  );

  it('o lazy de toda rota preguiçosa resolve um componente', async () => {
    const preguicosas = ROTAS_DO_UX_SPEC.filter((c) => c !== '/' && c !== '/lancar').map(acharRota);
    for (const rota of preguicosas) {
      const lazy = rota.lazy as () => Promise<Partial<RouteObject>>;
      const resolvido = await lazy();
      expect(resolvido.Component ?? resolvido.element).toBeTruthy();
    }
  });

  it('toda rota do UX-SPEC tem título no handle', () => {
    for (const caminho of ROTAS_DO_UX_SPEC) {
      const handle = acharRota(caminho).handle as { titulo?: string } | undefined;
      expect(handle?.titulo, caminho).toBeTruthy();
    }
  });

  it('as rotas com seletor de mês marcam comMes', () => {
    for (const caminho of ['/', '/lancamentos', '/fixas', '/orcamento']) {
      const handle = acharRota(caminho).handle as { comMes?: boolean };
      expect(handle.comMes, caminho).toBe(true);
    }
    const metas = acharRota('/metas').handle as { comMes?: boolean };
    expect(metas.comMes ?? false).toBe(false);
  });

  it('formulários e telas estreitas marcam estreito', () => {
    for (const caminho of ['/lancamentos/:id', '/fixas', '/fixas/nova', '/ajustes', '/ajustes/contas']) {
      const handle = acharRota(caminho).handle as { estreito?: boolean };
      expect(handle.estreito, caminho).toBe(true);
    }
    const inicio = acharRota('/').handle as { estreito?: boolean };
    expect(inicio.estreito ?? false).toBe(false);
  });
});
