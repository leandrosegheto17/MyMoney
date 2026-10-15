// @integracao: Supabase local (pnpm local:resetar antes). Variáveis em frontend/README.md.
import { expect, test, type Response } from '@playwright/test';
import { semViolacoesGraves } from '../apoio/acessibilidade';
import { entrarComo } from './apoio/sessao';

test.describe.configure({ mode: 'serial' });
test.use({ viewport: { width: 390, height: 844 } });

test('@integracao Leandro entra e vê o resumo com o nome dele', async ({ page }) => {
  await entrarComo(page, 'A');
  await page.goto('/');
  await expect(page.getByText('Eu · Leandro')).toBeVisible();
  await semViolacoesGraves(page);
});

test('@integracao quem não é membro entra e não recebe nome, valor nem item', async ({ page }) => {
  const dados: Response[] = [];
  page.on('response', (r) => {
    if (/\/rest\/v1\/rpc\/(contexto|resumo_mes|dados_lancamento|lancamentos_mes)/.test(new URL(r.url()).pathname)) dados.push(r);
  });
  await entrarComo(page, 'semMembro');
  await page.goto('/');
  await expect.poll(() => dados.length).toBeGreaterThan(0);
  await expect(page.getByText(/Eu ·/)).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/R\$|Leandro|Ana/);
  for (const r of dados) {
    const corpo = r.ok() ? await r.text() : '';
    expect(corpo, new URL(r.url()).pathname).not.toMatch(/Leandro|Ana|Mercado|Pix Nubank|centavos":\s*[1-9]/);
  }
});
