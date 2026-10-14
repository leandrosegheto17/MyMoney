// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/movimentar-meta.spec.ts
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
const PASTA_PRINTS = join(RAIZ, '.md', '.visual', DATA, 'TP-0156');
const lerJson = (arquivo: string) => JSON.parse(readFileSync(join(RAIZ, '.md', 'mockup', 'respostas', arquivo), 'utf8'));
const json = (corpo: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(corpo) });
const ID_VIAGEM = '00000000-0000-4000-8000-000000000902';
const ID_CARRO = '00000000-0000-4000-8000-000000000905';

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number], meta: string, caminho: string) {
  await page.route('**/rest/v1/rpc/contexto*', (r) => r.fulfill(json(lerJson('contexto.json'))));
  await page.route('**/rest/v1/rpc/dados_lancamento*', (r) => r.fulfill(json(lerJson('dados-lancamento.json'))));
  await page.route('**/rest/v1/rpc/locais_guardados*', (r) => r.fulfill(json(lerJson('locais-guardados.json'))));
  await page.route('**/rest/v1/rpc/movimentos_meta*', (r) =>
    r.fulfill(json(meta === ID_VIAGEM ? lerJson('movimentos-meta.json') : [])),
  );
  await page.route('**/rest/v1/metas*', (r) => r.fulfill(json(lerJson(meta === ID_VIAGEM ? 'meta-detalhe.json' : 'meta-carro.json'))));
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto(`/metas/${meta}${caminho}`);
}

for (const tamanho of TAMANHOS) {
  test.describe(`movimentar meta ${tamanho.nome}`, () => {
    test('aporte: axe e Esc fecha devolvendo o foco', async ({ page }) => {
      await abrir(page, tamanho, ID_VIAGEM, '');
      const aportar = page.getByRole('link', { name: 'Aportar' });
      await aportar.click();
      await expect(page.locator('#form-mov')).toBeVisible();
      await semViolacoesGraves(page);

      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(aportar).toBeFocused();
      expect(page.url()).not.toContain('movimentar');
    });

    test('retirada: axe', async ({ page }) => {
      await abrir(page, tamanho, ID_VIAGEM, '?movimentar=retirada');
      await expect(page.getByRole('radiogroup', { name: 'De onde sai' })).toBeVisible();
      await semViolacoesGraves(page);
    });

    test('estado vazio: axe', async ({ page }) => {
      await abrir(page, tamanho, ID_CARRO, '?movimentar=retirada');
      await expect(page.getByRole('heading', { name: 'Não há valor guardado para retirar' })).toBeVisible();
      await semViolacoesGraves(page);
    });

    test('foco preso na folha', async ({ page }) => {
      await abrir(page, tamanho, ID_VIAGEM, '?movimentar=aporte');
      await expect(page.locator('#form-mov')).toBeVisible();
      for (let i = 0; i < 12; i += 1) {
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
      }
    });

    test('erro do servidor aparece no campo de valor, e axe', async ({ page }) => {
      await page.route('**/rest/v1/rpc/movimentar_meta*', (r) =>
        r.fulfill(json({ code: 'P0001', message: 'retirada_maior_que_guardado', details: null, hint: null }, 400)),
      );
      await abrir(page, tamanho, ID_VIAGEM, '?movimentar=retirada');
      await page.getByRole('dialog').getByText('CDB Banco Inter', { exact: false }).first().click();
      await page.getByRole('dialog').getByRole('textbox', { name: 'Valor' }).pressSequentially('250000');
      await page.getByRole('button', { name: 'Confirmar retirada' }).click();

      const mensagem = 'Em CDB Banco Inter há R$ 2.000,00. A retirada não pode passar disso.';
      await expect(page.getByText(mensagem)).toBeVisible();
      await expect(page.getByRole('dialog').getByRole('textbox', { name: 'Valor' })).toHaveAttribute('aria-invalid', 'true');
      mkdirSync(PASTA_PRINTS, { recursive: true });
      await page.screenshot({ path: join(PASTA_PRINTS, `movimentar-meta--erro-${tamanho.nome}--app.png`), fullPage: true });
      await semViolacoesGraves(page);
    });
  });
}
