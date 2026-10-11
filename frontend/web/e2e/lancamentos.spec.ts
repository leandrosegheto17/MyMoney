// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/lancamentos.spec.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: 'celular', width: 390, height: 844, pc: false },
  { nome: 'pc', width: 1440, height: 900, pc: true },
];
const RESPOSTAS = join(process.cwd(), '..', '..', '.md', 'mockup', 'respostas');
const ler = (arquivo: string) => readFileSync(join(RESPOSTAS, arquivo), 'utf8');

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number], lista: 'sucesso' | 'pendente' | 'erro') {
  await page.route('**/rest/v1/rpc/contexto', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: ler('contexto.json') }),
  );
  await page.route('**/rest/v1/rpc/dados_lancamento', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: ler('dados-lancamento.json') }),
  );
  await page.route('**/rest/v1/rpc/lancamentos_mes*', (rota) => {
    if (lista === 'pendente') return new Promise(() => {});
    return lista === 'sucesso'
      ? rota.fulfill({ status: 200, contentType: 'application/json', body: ler('lancamentos-mes.json') })
      : rota.fulfill({ status: 503, contentType: 'application/json', body: ler('erro-servico.json') });
  });
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto('/lancamentos?mes=2026-10');
}

for (const tamanho of TAMANHOS) {
  test.describe(`lançamentos ${tamanho.nome}`, () => {
    test('sucesso: total, grupos por dia, 15 linhas e sem violações graves', async ({ page }) => {
      await abrir(page, tamanho, 'sucesso');

      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lançamentos de Outubro de 2026');
      await expect(page.getByRole('heading', { level: 2, name: 'Sábado, 10 de outubro' })).toBeVisible();
      await expect(page.getByText('R$ 846,30', { exact: true })).toBeVisible();
      await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(15);
      await semViolacoesGraves(page);
    });

    test('carregando: esqueleto, main ocupado e sem violações graves', async ({ page }) => {
      await abrir(page, tamanho, 'pendente');

      await expect(page.getByText('Carregando os lançamentos…')).toBeAttached();
      await expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'true');
      await semViolacoesGraves(page);
    });

    test('erro 503: só o estado de erro, sem total, e sem violações graves', async ({ page }) => {
      await abrir(page, tamanho, 'erro');

      await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('Total filtrado')).toHaveCount(0);
      await semViolacoesGraves(page);
    });

    test('o total fica fixo ao rolar', async ({ page }) => {
      await abrir(page, tamanho, 'sucesso');
      const total = page.locator('[aria-live="polite"]', { hasText: 'Total filtrado' });
      await expect(total).toBeVisible();
      const antes = await total.boundingBox();

      await page.mouse.move(tamanho.width / 2, tamanho.height / 2);
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(300);

      const depois = await total.boundingBox();
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      expect(depois?.y).toBeLessThanOrEqual((antes?.y ?? 0) + 1);
      expect(depois?.y).toBeGreaterThanOrEqual(0);
      await expect(total).toBeInViewport();
    });

    test(`colunas de data e pagador ${tamanho.pc ? 'aparecem' : 'não aparecem'}`, async ({ page }) => {
      await abrir(page, tamanho, 'sucesso');
      const primeira = page.getByRole('link', { name: /Fone bluetooth/ });
      await expect(primeira).toBeVisible();
      const data = primeira.getByText('10/10', { exact: true });
      const pagador = primeira.getByText('Você', { exact: true });
      if (tamanho.pc) {
        await expect(data).toBeVisible();
        await expect(pagador).toBeVisible();
      } else {
        await expect(data).toBeHidden();
        await expect(pagador).toBeHidden();
      }
    });
  });
}
