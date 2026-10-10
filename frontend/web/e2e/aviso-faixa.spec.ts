import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const DATA = new Date().toISOString().slice(0, 10);
const PASTA_PRINTS = join(process.cwd(), '..', '..', '.md', '.visual', DATA, 'TP-0039');

const AVISOS = [
  { botao: 'Sucesso', texto: 'Lançamento salvo', regiao: 'status', arquivo: 'aviso-sucesso' },
  { botao: 'Guardado', texto: 'Guardado no aparelho', regiao: 'status', arquivo: 'aviso-guardado' },
  { botao: 'Erro', texto: 'Não foi possível salvar', regiao: 'alert', arquivo: 'aviso-erro' },
] as const;

async function abrir(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/e2e/vitrine/aviso-faixa.html');
  await expect(page.getByRole('heading', { name: 'Aviso e Faixa' })).toBeVisible();
}

test('as 4 faixas reais não têm violações graves e ganham print', async ({ page }) => {
  await abrir(page);
  await expect(page.getByRole('status').filter({ hasText: 'Sem conexão' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Mostrando dados de 14:32' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Instalar o app' })).toBeVisible();
  await semViolacoesGraves(page);
  mkdirSync(PASTA_PRINTS, { recursive: true });
  await page.screenshot({ path: join(PASTA_PRINTS, 'faixas-390x844.png') });
});

for (const aviso of AVISOS) {
  test(`aviso ${aviso.botao.toLowerCase()} real na região ${aviso.regiao}, sem violações graves, com print`, async ({
    page,
  }) => {
    await abrir(page);
    await page.getByRole('button', { name: aviso.botao }).click();
    const visivel = page
      .locator(aviso.regiao === 'alert' ? '[role=alert]' : '[role=status][aria-live=polite]')
      .getByText(aviso.texto);
    await expect(visivel).toBeVisible();
    await semViolacoesGraves(page);
    mkdirSync(PASTA_PRINTS, { recursive: true });
    await page.screenshot({ path: join(PASTA_PRINTS, `${aviso.arquivo}-390x844.png`) });
    await expect(visivel).toBeHidden({ timeout: 6000 });
  });
}
