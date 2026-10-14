// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/ajustes.spec.ts
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: 'celular', width: 390, height: 844 },
  { nome: 'pc', width: 1440, height: 900 },
];
const DATA = new Date().toISOString().slice(0, 10);
const RAIZ = join(process.cwd(), '..', '..');
const PASTA_PRINTS = join(RAIZ, '.md', '.visual', DATA, 'ajustes');
const CONTEXTO = readFileSync(join(RAIZ, '.md', 'mockup', 'respostas', 'contexto.json'), 'utf8');

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number]) {
  await page.route('**/rest/v1/rpc/contexto', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: CONTEXTO }),
  );
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto('/ajustes');
  await expect(page.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeVisible();
}

mkdirSync(PASTA_PRINTS, { recursive: true });

for (const tamanho of TAMANHOS) {
  test.describe(`ajustes ${tamanho.nome}`, () => {
    test('sucesso: itens, alvos de 44 px e sem violações graves', async ({ page }) => {
      await abrir(page, tamanho);

      await expect(page.getByText('Leandro · leandro@exemplo.com')).toBeVisible();
      for (const alvo of await page.locator('main a, main button').all()) {
        expect((await alvo.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
      await page.screenshot({ path: join(PASTA_PRINTS, `ajustes--sucesso-${tamanho.nome}--app.png`), fullPage: true });
      await semViolacoesGraves(page);
    });

    test('ajustes--sair-todos: diálogo, sem violações graves e foco volta ao item ao cancelar', async ({ page }) => {
      await abrir(page, tamanho);
      const item = page.getByRole('button', { name: 'Sair de todos os aparelhos' });
      await item.click();

      const dialogo = page.getByRole('alertdialog', { name: 'Sair de todos os aparelhos?' });
      await expect(dialogo).toBeVisible();
      await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused();
      await page.screenshot({
        path: join(PASTA_PRINTS, `ajustes--sair-todos-${tamanho.nome}--app.png`),
        fullPage: true,
      });
      await semViolacoesGraves(page);

      await dialogo.getByRole('button', { name: 'Cancelar' }).click();
      await expect(dialogo).toHaveCount(0);
      await expect(item).toBeFocused();
    });
  });
}
