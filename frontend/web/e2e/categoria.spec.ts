// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/categoria.spec.ts
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
const ID = '00000000-0000-4000-8000-000000000401';
const ler = (arquivo: string) => readFileSync(join(MOCKUP, 'respostas', arquivo), 'utf8');
const json = (corpo: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(corpo) });
const categoria = () => ({ ...(JSON.parse(ler('categoria-mercado.json')) as object[])[0], pode_excluir: true });

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number], rota = `/ajustes/categorias/${ID}`) {
  await page.route('**/rest/v1/rpc/contexto', (r) => r.fulfill(json(JSON.parse(ler('contexto.json')))));
  await page.route('**/rest/v1/categorias*', (r) => r.fulfill(json([categoria()])));
  await page.route('**/rest/v1/rpc/salvar_categoria*', (r) => r.fulfill(json({ message: 'nome_repetido' }, 400)));
  await page.route('**/rest/v1/rpc/excluir_categoria*', (r) => r.fulfill(json({ message: 'categoria_em_uso' }, 400)));
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto(rota);
}

async function alvosGrandes(page: Page) {
  for (const alvo of await page.locator('main a, main button, main input, main select').all()) {
    if (await alvo.evaluate((el) => el.matches('input[type="radio"], input[role="switch"]'))) continue;
    expect((await alvo.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
}

for (const tamanho of TAMANHOS) {
  test.describe(`categoria ${tamanho.nome}`, () => {
    test('sucesso: tipo e escopo só leitura, alvos e axe', async ({ page }) => {
      await abrir(page, tamanho);

      await expect(page.getByLabel('Nome')).toHaveValue('Mercado');
      await expect(page.getByText('Escolhidos na criação. Mudanças no nome valem para os dois.')).toBeVisible();
      await expect(page.getByRole('radio')).toHaveCount(0);
      await expect(page.getByRole('switch', { name: /Gasto variável/ })).toBeChecked();
      await alvosGrandes(page);
      await semViolacoesGraves(page);
    });

    test('nova: nome repetido no campo, receita trava o escopo e axe', async ({ page }) => {
      await abrir(page, tamanho, '/ajustes/categorias/nova');

      await page.getByRole('radio', { name: 'Receita' }).check({ force: true });
      await expect(page.getByRole('radio', { name: 'Minha' })).toBeChecked();
      await expect(page.getByRole('radio', { name: 'Da casa' })).toBeDisabled();
      await expect(page.getByRole('switch')).toHaveCount(0);
      await page.getByRole('radio', { name: 'Despesa' }).check({ force: true });
      await page.getByRole('radio', { name: 'Da casa' }).check({ force: true });

      await page.getByLabel('Nome').fill('Mercado');
      await page.getByRole('button', { name: 'Criar categoria' }).click();
      await expect(page.getByLabel('Nome')).toBeFocused();
      await expect(page.getByText('Já existe uma categoria da casa com esse nome.')).toBeVisible();
      await alvosGrandes(page);
      await semViolacoesGraves(page);

      if (PASTA_PRINTS) {
        mkdirSync(PASTA_PRINTS, { recursive: true });
        await page.screenshot({ path: join(PASTA_PRINTS, `categoria--erro-${tamanho.nome}--app.png`), fullPage: true });
        await page.goto(pathToFileURL(join(MOCKUP, 'telas', 'categoria--erro.html')).href);
        await page.screenshot({ path: join(PASTA_PRINTS, `categoria--erro-${tamanho.nome}--mockup.png`), fullPage: true });
      }
    });

    test('excluir: diálogo sem violações e, em uso, o aviso com Arquivar categoria', async ({ page }) => {
      await abrir(page, tamanho);

      await page.getByRole('button', { name: 'Excluir' }).click();
      const dialogo = page.getByRole('alertdialog', { name: 'Excluir esta categoria?' });
      await expect(dialogo).toBeVisible();
      await page.waitForTimeout(300);
      await semViolacoesGraves(page);

      await dialogo.getByRole('button', { name: 'Excluir' }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'Esta categoria tem lançamentos' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Arquivar categoria' })).toBeVisible();
      await alvosGrandes(page);
      await semViolacoesGraves(page);
    });
  });
}
