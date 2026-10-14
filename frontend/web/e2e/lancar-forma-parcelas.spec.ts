// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/lancar-forma-parcelas.spec.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const RESPOSTAS = join(process.cwd(), '..', '..', '.md', 'mockup', 'respostas');
const ler = (arquivo: string) => readFileSync(join(RESPOSTAS, arquivo), 'utf8');

async function abrirFolha(page: Page) {
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
  await expect(page.locator('#valor')).toBeAttached();
  await page.getByRole('navigation').first().getByRole('link', { name: 'Lançar' }).click();
  await expect(page.getByRole('dialog', { name: 'Lançar' })).toBeVisible();
  await page.waitForTimeout(400);
}

async function alturasDosAlvos(grupo: Locator, seletor: string) {
  return grupo.locator(seletor).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
}

for (const [nome, largura, altura] of [
  ['celular 390', 390, 844],
  ['PC 1440 (diálogo de 480 px)', 1440, 900],
] as const) {
  test.describe(nome, () => {
    test.use({ viewport: { width: largura, height: altura }, hasTouch: largura < 600 });

    test('Pix → Crédito mostra Parcelas; 3x; alvos de 44 px; passo a passo e Mais detalhes sem violação grave', async ({
      page,
    }) => {
      await abrirFolha(page);
      const folha = page.getByRole('dialog', { name: 'Lançar' });
      await expect(folha.getByRole('button', { name: /^Forma de pagamento Pix Nubank · Pix/ })).toBeVisible();
      await expect(folha.getByRole('radiogroup', { name: 'Parcelas' })).toHaveCount(0);

      await folha.getByRole('button', { name: /^Forma de pagamento/ }).click();
      await page.getByRole('radio', { name: /Cartão de crédito XP/ }).locator('xpath=ancestor::label').click();
      const parcelas = folha.getByRole('radiogroup', { name: 'Parcelas' });
      await expect(parcelas).toBeVisible();
      await expect(parcelas.getByRole('radio', { name: 'À vista' })).toBeChecked();

      await parcelas.getByText('3x', { exact: true }).click();
      await expect(parcelas.getByRole('radio', { name: '3x' })).toBeChecked();

      for (const h of await alturasDosAlvos(parcelas, 'label, button')) {
        expect(h).toBeGreaterThanOrEqual(44);
      }

      await parcelas.getByRole('button', { name: 'Outro' }).click();
      await expect(folha.getByRole('button', { name: 'Aumentar parcelas' })).toBeVisible();
      for (const nomeBotao of ['Diminuir parcelas', 'Aumentar parcelas']) {
        const caixa = await folha.getByRole('button', { name: nomeBotao }).boundingBox();
        expect(caixa!.height).toBeGreaterThanOrEqual(44);
        expect(caixa!.width).toBeGreaterThanOrEqual(44);
      }
      await semViolacoesGraves(page);

      await folha.getByText(/^Mais detalhes/).click();
      await expect(folha.getByLabel('Data')).toBeVisible();
      await semViolacoesGraves(page);
    });
  });
}
