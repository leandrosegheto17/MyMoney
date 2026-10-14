// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/lancar-categoria.spec.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const RESPOSTAS = join(process.cwd(), '..', '..', '.md', 'mockup', 'respostas');
const ler = (arquivo: string) => readFileSync(join(RESPOSTAS, arquivo), 'utf8');

async function abrirFolha(page: Page) {
  for (const [rota, arquivo] of [
    ['contexto', 'contexto.json'],
    ['dados_lancamento', 'dados-lancamento.json'],
    ['resumo_mes*', 'resumo-mes.json'],
  ]) {
    await page.route(`**/rest/v1/rpc/${rota}`, (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: ler(arquivo) }),
    );
  }
  await page.goto('/?mes=2026-10');
  await expect(page.locator('#valor')).toBeAttached();
  await page.getByRole('navigation').first().getByRole('link', { name: 'Lançar' }).click();
  await expect(page.getByRole('dialog', { name: 'Lançar' })).toBeVisible();
  await page.waitForTimeout(400);
}

const grade = (page: Page) => page.getByRole('radiogroup', { name: 'Categoria' });

async function colunas(page: Page) {
  const caixas = await grade(page).locator('label, button').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), h: r.height };
    }),
  );
  return { caixas, colunas: new Set(caixas.map((c) => c.x)).size, linhas: new Set(caixas.map((c) => c.y)).size };
}

for (const [nome, largura, altura] of [
  ['celular 390', 390, 844],
  ['PC 1440 (diálogo de 480 px)', 1440, 900],
] as const) {
  test.describe(nome, () => {
    test.use({ viewport: { width: largura, height: altura }, hasTouch: largura < 600 });

    test('grade 3×3, chips de 64 px ou mais, lista aberta sem violação grave', async ({ page }) => {
      await abrirFolha(page);

      const { caixas, colunas: nCol, linhas } = await colunas(page);
      expect(caixas).toHaveLength(9);
      expect(nCol).toBe(3);
      expect(linhas).toBe(3);
      for (const c of caixas) expect(c.h).toBeGreaterThanOrEqual(64);

      await grade(page).getByRole('button', { name: 'Outras…' }).click();
      await expect(page.getByRole('searchbox', { name: 'Buscar categoria' })).toBeFocused();
      await semViolacoesGraves(page);
    });
  });
}

test.describe('larguras e teclado', () => {
  test('320 px sem rolagem horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await abrirFolha(page);

    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(sobra).toBeLessThanOrEqual(0);
    const folha = await page.getByRole('dialog', { name: 'Lançar' }).evaluate((e) => e.scrollWidth - e.clientWidth);
    expect(folha).toBeLessThanOrEqual(0);
  });

  test('390×500 (teclado aberto): a grade inteira é alcançável rolando a folha', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 500 });
    await abrirFolha(page);

    const ultima = grade(page).getByRole('button', { name: 'Outras…' });
    await ultima.scrollIntoViewIfNeeded();
    await expect(ultima).toBeInViewport({ ratio: 0.9 });
    await expect(grade(page).getByRole('radio').first()).toBeAttached();
  });
});
