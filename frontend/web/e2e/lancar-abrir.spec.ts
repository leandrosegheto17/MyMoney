// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/lancar-abrir.spec.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const RESPOSTAS = join(process.cwd(), '..', '..', '.md', 'mockup', 'respostas');
const ler = (arquivo: string) => readFileSync(join(RESPOSTAS, arquivo), 'utf8');

async function abrirInicio(page: Page) {
  for (const [rota, arquivo] of [
    ['contexto', 'contexto.json'],
    ['dados_lancamento', 'dados-lancamento.json'],
    ['resumo_mes*', 'resumo-mes.json'],
  ]) {
    await page.route(`**/rest/v1/rpc/${rota}`, (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: ler(arquivo) }),
    );
  }
  await page.goto('/?mes=2026-10');
}

const CASOS = [
  { nome: 'celular (toque no "+" da barra)', width: 390, height: 844 },
  { nome: 'PC (clique no "+" do trilho)', width: 1440, height: 900 },
];

for (const caso of CASOS) {
  test.describe(caso.nome, () => {
    test.use({ viewport: { width: caso.width, height: caso.height }, hasTouch: caso.width < 600 });

    test('o "+" abre a folha com o foco no valor; Esc fecha e devolve o foco ao "+"', async ({ page }) => {
      await abrirInicio(page);
      const mais = page.getByRole('navigation').first().getByRole('link', { name: 'Lançar' });
      await expect(page.locator('#valor')).toBeAttached();
      await semViolacoesGraves(page);

      await mais.focus();
      await mais.click();

      await expect(page.getByRole('dialog', { name: 'Lançar' })).toBeVisible();
      await expect(page.locator('#valor')).toBeFocused();
      await expect(page).toHaveURL(/\/\?mes=2026-10$/);
      await page.waitForTimeout(400);
      await semViolacoesGraves(page);

      await page.keyboard.press('Escape');

      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(mais).toBeFocused();
    });
  });
}
