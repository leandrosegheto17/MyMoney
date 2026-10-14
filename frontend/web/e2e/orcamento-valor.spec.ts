// Mesmo ambiente de orcamento.spec.ts (Vite em modo de sessão falsa e Supabase falso).
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
const PASTA_PRINTS = join(RAIZ, '.md', '.visual', DATA, 'TP-0142');
const RESPOSTAS = join(RAIZ, '.md', 'mockup', 'respostas');
const ler = (arquivo: string) => readFileSync(join(RESPOSTAS, arquivo), 'utf8');
const CAMINHO = '/orcamento?mes=2026-10&escopo=casa&editar=00000000-0000-4000-8000-000000000404';

mkdirSync(PASTA_PRINTS, { recursive: true });

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number]) {
  await page.route('**/rest/v1/rpc/contexto', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: ler('contexto.json') }),
  );
  await page.route('**/rest/v1/rpc/orcamento_mes*', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: ler('orcamento-mes.json') }),
  );
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto(CAMINHO);
  await expect(page.getByRole('dialog', { name: 'Orçamento de Contas da casa' })).toBeVisible();
}

for (const tamanho of TAMANHOS) {
  test.describe(`valor do orçamento ${tamanho.nome}`, () => {
    test('folha aberta: sem violações graves', async ({ page }) => {
      await abrir(page, tamanho);

      await expect(page.getByLabel('Valor orçado')).toHaveValue(/300,00/);
      await semViolacoesGraves(page);
    });

    test('sem rede: avisa, mantém o valor e a folha aberta', async ({ page }) => {
      await abrir(page, tamanho);
      await page.route('**/rest/v1/rpc/definir_orcamento*', (rota) => rota.abort('internetdisconnected'));

      await page.getByLabel('Valor orçado').fill('45000');
      await page.getByRole('button', { name: 'Salvar' }).click();

      const aviso = page.getByRole('alert').filter({ hasText: 'Sem conexão.' });
      await expect(aviso).toBeVisible();
      await expect(page.getByLabel('Valor orçado')).toHaveValue(/450,00/);
      await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
      await page.screenshot({ path: join(PASTA_PRINTS, `sem-rede-${tamanho.nome}.png`) });
      await semViolacoesGraves(page);
    });
  });
}

test.describe('valor do orçamento: teclado', () => {
  test('foco preso na folha; Esc fecha e devolve o foco à linha', async ({ page }) => {
    await abrir(page, TAMANHOS[0]);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).not.toHaveURL(/editar=/);

    await page.getByRole('link', { name: /^Editar orçamento de Contas da casa/ }).click();
    const folha = page.getByRole('dialog', { name: 'Orçamento de Contas da casa' });
    await expect(folha).toBeVisible();
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      expect(await folha.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^Editar orçamento de Contas da casa/ })).toBeFocused();
  });
});
