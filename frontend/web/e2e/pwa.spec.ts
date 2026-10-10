import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { build, preview, type PreviewServer } from 'vite';
import { semViolacoesGraves } from './apoio/acessibilidade';

let saida: string;
let servidor: PreviewServer;
let origem: string;

test.beforeAll(async () => {
  test.setTimeout(180_000);
  saida = mkdtempSync(join(tmpdir(), 'mymoney-pwa-e2e-'));
  const base = {
    configFile: join(process.cwd(), 'vite.config.ts'),
    logLevel: 'silent' as const,
    build: { outDir: saida, emptyOutDir: true },
  };
  await build({ ...base, mode: 'production' });
  servidor = await preview({ ...base, preview: { host: '127.0.0.1', port: 0, strictPort: false } });
  origem = servidor.resolvedUrls?.local[0]?.replace(/\/$/, '') ?? '';
});

test.afterAll(async () => {
  await servidor?.close();
  if (saida) rmSync(saida, { recursive: true, force: true });
});

test('service worker ativo e app shell abre com a rede desligada', async ({ page, context }) => {
  await page.goto(origem);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('main').first()).toBeVisible();
  await semViolacoesGraves(page);
  await context.setOffline(false);
});

test('manifest instalável e apple-touch-icon respondendo', async ({ page, request }) => {
  await page.goto(origem);
  const sessao = await page.context().newCDPSession(page);
  const { installabilityErrors } = await sessao.send('Page.getInstallabilityErrors');
  expect(installabilityErrors).toEqual([]);

  const href = await page.locator('link[rel=apple-touch-icon]').getAttribute('href');
  expect(href).toBeTruthy();
  const resposta = await request.get(new URL(href as string, origem).toString());
  expect(resposta.status()).toBe(200);
});
