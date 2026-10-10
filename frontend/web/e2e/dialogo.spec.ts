import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const PASTA_PRINTS = process.env.PASTA_PRINTS;

const CASOS = [
  {
    caso: 'excluir',
    titulo: 'Excluir esta compra e as 3 parcelas?',
    texto: 'Geladeira nova, R$ 1.950,00 em 3x. A exclusão vale para os dois e não pode ser desfeita.',
    confirmar: 'Excluir',
  },
  {
    caso: 'sair',
    titulo: 'Sair de todos os aparelhos?',
    texto:
      'Você vai precisar entrar de novo com e-mail e senha em todos os aparelhos, inclusive neste. Lançamentos aguardando envio continuam guardados no aparelho.',
    confirmar: 'Sair de todos',
  },
  {
    caso: 'descarte',
    titulo: 'Descartar ajuste de data?',
    texto:
      'A parcela 3/3 teve a data ajustada à mão (17/11). Ao mudar o valor total, as 3 parcelas são recalculadas pelo vencimento do cartão e esse ajuste será descartado.',
    confirmar: 'Recalcular e salvar',
  },
];

async function abrir(page: Page, caso: string, titulo: string) {
  await page.goto(`/e2e/vitrine/dialogo.html?caso=${caso}`);
  await page.getByRole('button', { name: 'Abrir diálogo' }).click();
  const dialogo = page.getByRole('alertdialog', { name: titulo });
  await expect(dialogo).toBeVisible();
  return dialogo;
}

async function print(page: Page, nome: string) {
  if (!PASTA_PRINTS) return;
  mkdirSync(PASTA_PRINTS, { recursive: true });
  await page.screenshot({ path: join(PASTA_PRINTS, `${nome}.png`) });
}

for (const [nome, viewport] of [
  ['390x844', { width: 390, height: 844 }],
  ['1440x900', { width: 1440, height: 900 }],
] as const) {
  test.describe(nome, () => {
    test.use({ viewport });

    for (const c of CASOS) {
      test(`${c.caso}: textos, acima da folha, alvos, axe e print`, async ({ page }) => {
        const dialogo = await abrir(page, c.caso, c.titulo);
        await page.waitForTimeout(300);
        await expect(dialogo).toHaveAccessibleDescription(c.texto);
        await expect(dialogo.getByRole('button', { name: c.confirmar })).toBeVisible();

        const caixa = (await dialogo.boundingBox())!;
        const atingido = await page.evaluate(
          ({ x, y }) => document.elementFromPoint(x, y)?.closest('[role="alertdialog"]') !== null,
          { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 },
        );
        expect(atingido).toBe(true);

        for (const botao of await dialogo.getByRole('button').all()) {
          const b = (await botao.boundingBox())!;
          expect(b.height).toBeGreaterThanOrEqual(44);
          expect(b.width).toBeGreaterThanOrEqual(44);
        }
        await semViolacoesGraves(page);
        await print(page, `vitrine-${c.caso}-${nome}`);
      });
    }

    test('Cancelar e Esc voltam ao gatilho; confirmar só pelo botão', async ({ page }) => {
      const c = CASOS[0]!;
      const dialogo = await abrir(page, c.caso, c.titulo);
      await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialogo).toBeHidden();
      await expect(page.getByRole('dialog', { name: 'Lançamento' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Abrir diálogo' })).toBeFocused();
      await expect(page.locator('html')).toHaveClass(/com-folha/);
      await page.getByRole('button', { name: 'Abrir diálogo' }).click();
      await page.getByRole('button', { name: c.confirmar }).click();
      await expect(page.getByRole('status')).toHaveText('Confirmações: 1');
    });
  });
}
