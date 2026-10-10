import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const VITRINE = '/e2e/vitrine/folha.html';
const PASTA_PRINTS = process.env.PASTA_PRINTS;

async function abrir(page: Page) {
  await page.goto(VITRINE);
  await page.getByRole('button', { name: 'Abrir folha' }).click();
  const folha = page.getByRole('dialog', { name: 'Marcar como paga' });
  await expect(folha).toBeVisible();
  await page.waitForTimeout(300);
  return folha;
}

async function print(page: Page, nome: string) {
  if (!PASTA_PRINTS) return;
  mkdirSync(PASTA_PRINTS, { recursive: true });
  await page.screenshot({ path: join(PASTA_PRINTS, `${nome}.png`) });
}

async function arrastarAlca(page: Page, deslocamento: number) {
  const caixa = (await page.locator('[data-arraste]').first().boundingBox())!;
  const x = caixa.x + caixa.width / 2;
  const y = caixa.y + caixa.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + deslocamento / 2, { steps: 5 });
  await page.mouse.move(x, y + deslocamento, { steps: 5 });
  await page.mouse.up();
}

test.describe('celular 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('folha ancorada embaixo, com axe e print', async ({ page }) => {
    const folha = await abrir(page);
    const caixa = (await folha.boundingBox())!;
    expect(Math.round(caixa.y + caixa.height)).toBe(844);
    expect(Math.round(caixa.width)).toBe(390);
    await expect(page.locator('html')).toHaveClass(/com-folha/);
    await semViolacoesGraves(page);
    await print(page, 'vitrine-390x844');
  });

  test('arrastar a alca 150 px para baixo fecha; 20 px nao', async ({ page }) => {
    const folha = await abrir(page);
    await arrastarAlca(page, 20);
    await page.waitForTimeout(300);
    await expect(folha).toBeVisible();
    const caixa = (await folha.boundingBox())!;
    expect(Math.round(caixa.y + caixa.height)).toBe(844);
    await arrastarAlca(page, 150);
    await expect(folha).toBeHidden();
    await expect(page.getByRole('button', { name: 'Abrir folha' })).toBeFocused();
    await expect(page.locator('html')).not.toHaveClass(/com-folha/);
  });

  test('Esc fecha e o foco volta ao gatilho', async ({ page }) => {
    const folha = await abrir(page);
    await page.keyboard.press('Escape');
    await expect(folha).toBeHidden();
    await expect(page.getByRole('button', { name: 'Abrir folha' })).toBeFocused();
  });

  test('alvo do X tem ao menos 44 px', async ({ page }) => {
    await abrir(page);
    const caixa = (await page.getByRole('button', { name: 'Fechar' }).boundingBox())!;
    expect(caixa.width).toBeGreaterThanOrEqual(44);
    expect(caixa.height).toBeGreaterThanOrEqual(44);
  });

  test('montada e oculta: fora da arvore de acessibilidade ate abrir', async ({ page }) => {
    await page.goto(`${VITRINE}?oculta`);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('input')).toBeHidden();
    await page.getByRole('button', { name: 'Abrir folha' }).click();
    await expect(page.getByRole('dialog', { name: 'Marcar como paga' })).toBeVisible();
  });
});

test.describe('PC 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('dialogo centrado de 480 px, sem alca, com axe e print', async ({ page }) => {
    const folha = await abrir(page);
    const caixa = (await folha.boundingBox())!;
    expect(Math.round(caixa.width)).toBe(480);
    expect(Math.abs(caixa.x + caixa.width / 2 - 720)).toBeLessThanOrEqual(1);
    expect(Math.abs(caixa.y + caixa.height / 2 - 450)).toBeLessThanOrEqual(1);
    await expect(page.locator('[data-arraste]').first()).toBeHidden();
    await semViolacoesGraves(page);
    await print(page, 'vitrine-1440x900');
  });

  test('X fecha e devolve o foco ao gatilho', async ({ page }) => {
    const folha = await abrir(page);
    await page.getByRole('button', { name: 'Fechar' }).click();
    await expect(folha).toBeHidden();
    await expect(page.getByRole('button', { name: 'Abrir folha' })).toBeFocused();
  });
});

test.describe('prefers-reduced-motion', () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

  test('a transicao computada e 0 s', async ({ page }) => {
    const folha = await abrir(page);
    const duracao = await folha.evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(duracao).toBe('0s');
  });
});
