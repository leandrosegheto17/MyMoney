// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/fixa.spec.ts
// PASTA_PRINTS=<pasta> grava o app e o mockup do estado de erro.
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: 'celular', width: 390, height: 844 },
  { nome: 'pc', width: 1440, height: 900 },
];
const MOCKUP = join(process.cwd(), '..', '..', '.md', 'mockup');
const PASTA_PRINTS = process.env.PASTA_PRINTS;
const ID = '00000000-0000-4000-8000-000000000701';
const ler = (arquivo: string) => readFileSync(join(MOCKUP, 'respostas', arquivo), 'utf8');
const json = (corpo: string, status = 200) => ({ status, contentType: 'application/json', body: corpo });

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number], rota: string) {
  await page.route('**/rest/v1/rpc/contexto', (r) => r.fulfill(json(ler('contexto.json'))));
  await page.route('**/rest/v1/despesas_fixas*', (r) => r.fulfill(json(ler('despesa-fixa.json'))));
  await page.route('**/rest/v1/categorias*', (r) => r.fulfill(json(ler('categorias.json'))));
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto(rota);
}

for (const tamanho of TAMANHOS) {
  test.describe(`despesa fixa ${tamanho.nome}`, () => {
    test('sucesso: modelo carregado, alvos de 44 px e axe', async ({ page }) => {
      await abrir(page, tamanho, `/fixas/${ID}?mes=2026-10`);

      await expect(page.getByLabel('Descrição')).toHaveValue('Aluguel');
      for (const alvo of await page.locator('main button, main input, main select').all()) {
        expect((await alvo.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
      await semViolacoesGraves(page);
    });

    test('erro: nova com descrição vazia e dia 32, axe e prints lado a lado', async ({ page }) => {
      await abrir(page, tamanho, '/fixas/nova?mes=2026-10');

      await expect(page.getByRole('heading', { level: 1, name: 'Nova despesa fixa' })).toBeVisible();
      await page.getByLabel('Categoria da casa').selectOption({ label: 'Contas da casa' });
      await page.getByLabel('Valor previsto').pressSequentially('7990');
      await page.getByLabel('Dia de vencimento').fill('32');
      await page.getByRole('button', { name: 'Salvar' }).click();

      await expect(page.getByText('Informe a descrição.')).toBeVisible();
      await expect(page.getByText('Use um dia de 1 a 31.')).toBeVisible();
      await expect(page.getByLabel('Descrição')).toBeFocused();
      await semViolacoesGraves(page);

      if (PASTA_PRINTS) {
        mkdirSync(PASTA_PRINTS, { recursive: true });
        await page.screenshot({ path: join(PASTA_PRINTS, `fixa--erro-${tamanho.nome}--app.png`), fullPage: true });
        await page.goto(pathToFileURL(join(MOCKUP, 'telas', 'fixa--erro.html')).href);
        await page.screenshot({ path: join(PASTA_PRINTS, `fixa--erro-${tamanho.nome}--mockup.png`), fullPage: true });
      }
    });

    test('encerrar: diálogo com foco em Cancelar, axe e Esc devolve o foco', async ({ page }) => {
      await abrir(page, tamanho, `/fixas/${ID}?mes=2026-10`);

      const gatilho = page.getByRole('button', { name: 'Encerrar despesa fixa' });
      await gatilho.click();
      const dialogo = page.getByRole('alertdialog');
      await expect(dialogo).toBeVisible();
      await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused();
      await semViolacoesGraves(page);
      await page.keyboard.press('Escape');
      await expect(dialogo).toBeHidden();
      await expect(gatilho).toBeFocused();
    });
  });
}
