// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/meta-form.spec.ts
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: 'celular', width: 390, height: 844 },
  { nome: 'pc', width: 1440, height: 900 },
];
const MOCKUP = join(process.cwd(), '..', '..', '.md', 'mockup');
const lerJson = (arquivo: string) => JSON.parse(readFileSync(join(MOCKUP, 'respostas', arquivo), 'utf8'));
const json = (corpo: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(corpo) });
const PASTA_PRINTS = join(MOCKUP, '..', '.visual', new Date().toISOString().slice(0, 10), 'TP-0155');
const ID = '00000000-0000-4000-8000-000000000902';

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number], caminho: string) {
  await page.route('**/rest/v1/rpc/contexto*', (r) => r.fulfill(json(lerJson('contexto.json'))));
  await page.route('**/rest/v1/metas*', (r) => r.fulfill(json(lerJson('meta-detalhe.json'))));
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto(caminho);
}

for (const tamanho of TAMANHOS) {
  test.describe(`formulário de meta ${tamanho.nome}`, () => {
    test('edição: campos carregados, escopo em texto e axe', async ({ page }) => {
      await abrir(page, tamanho, `/metas/${ID}/editar`);

      await expect(page.locator('#nome')).toHaveValue('Viagem Nordeste');
      await expect(page.locator('#prazo')).toHaveValue('2027-07');
      await expect(page.getByRole('radio')).toHaveCount(0);
      await semViolacoesGraves(page);
    });

    test('erro: alvo vazio mostra o erro no campo, com foco, e axe', async ({ page }) => {
      await abrir(page, tamanho, '/metas/nova');

      await page.locator('#nome').fill('Carro novo');
      await page.locator('#prazo').fill('2028-12');
      await page.getByRole('button', { name: 'Criar meta' }).click();

      await expect(page.locator('#alvo')).toBeFocused();
      await expect(page.locator('#alvo')).toHaveAttribute('aria-describedby', /alvo-erro/);
      await expect(page.getByText('Informe um valor-alvo maior que zero.')).toBeVisible();
      await semViolacoesGraves(page);
    });

    test('erro: mesma geometria do mockup (escopo na largura toda, mesma altura)', async ({ page, context }) => {
      mkdirSync(PASTA_PRINTS, { recursive: true });
      await abrir(page, tamanho, '/metas/nova');
      await page.locator('#nome').fill('Carro novo');
      await page.locator('#prazo').fill('2028-12');
      await page.getByRole('button', { name: 'Criar meta' }).click();
      await expect(page.locator('#alvo-erro')).toBeVisible();

      const mockup = await context.newPage();
      await mockup.setViewportSize({ width: tamanho.width, height: tamanho.height });
      await mockup.goto(pathToFileURL(join(MOCKUP, 'telas', 'meta-form--erro.html')).href);
      await mockup.evaluate(() => document.fonts.ready);

      const medir = (p: Page) =>
        p.evaluate(() => {
          const caixa = (e: Element | null) => {
            const r = e?.getBoundingClientRect();
            return r ? { y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null;
          };
          return {
            altura: document.documentElement.scrollHeight,
            segmentado: caixa(document.querySelector('[role="radio"], input[type="radio"]')?.closest('label')?.parentElement ?? null),
            botao: caixa([...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Criar meta')) ?? null),
          };
        });
      const app = await medir(page);
      const modelo = await medir(mockup);
      await page.screenshot({ path: join(PASTA_PRINTS, `erro-${tamanho.nome}--app.png`), fullPage: true });
      await mockup.screenshot({ path: join(PASTA_PRINTS, `erro-${tamanho.nome}--mockup.png`), fullPage: true });

      expect(app).toEqual(modelo);
    });

    test('teclado: setas trocam o escopo', async ({ page }) => {
      await abrir(page, tamanho, '/metas/nova');

      const minha = page.getByRole('radio', { name: 'Minha' });
      await minha.focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('radio', { name: 'Da casa' })).toBeChecked();
      await page.keyboard.press('ArrowLeft');
      await expect(minha).toBeChecked();
    });
  });
}
