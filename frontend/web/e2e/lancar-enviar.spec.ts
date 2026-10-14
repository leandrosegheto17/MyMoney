// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/lancar-enviar.spec.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
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
  const folha = page.getByRole('dialog', { name: 'Lançar' });
  await expect(folha).toBeVisible();
  await page.waitForTimeout(400);
  return folha;
}

async function preencherCredito3x(page: Page) {
  const folha = page.getByRole('dialog', { name: 'Lançar' });
  await folha.locator('#valor').click();
  await page.keyboard.type('36000');
  await folha.getByRole('radio', { name: /^Mercado/ }).locator('xpath=ancestor::label').click();
  await folha.getByRole('button', { name: /^Forma de pagamento/ }).click();
  await page.getByRole('radio', { name: /Cartão de crédito XP/ }).locator('xpath=ancestor::label').click();
  await folha.getByRole('radiogroup', { name: 'Parcelas' }).getByText('3x', { exact: true }).click();
}

test.describe('enviar o lançamento', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('sucesso: botão com valor e parcelas, sem violação grave', async ({ page }) => {
    const folha = await abrirFolha(page);
    await preencherCredito3x(page);

    await expect(folha.getByRole('button', { name: 'Lançar R$ 360,00 em 3x' })).toBeVisible();
    await semViolacoesGraves(page);
  });

  test('confirmado: aviso do servidor, formulário limpo e forma mantida', async ({ page }) => {
    await page.route('**/rest/v1/rpc/lancar_despesa*', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: ler('lancar-despesa-credito.json') }),
    );
    const folha = await abrirFolha(page);
    await preencherCredito3x(page);

    await folha.getByRole('button', { name: /^Lançar R\$/ }).click();

    await expect(
      page.getByRole('status').getByText('Lançado em 3x · Mercado · Casa · 1ª parcela em 10/11'),
    ).toBeVisible();
    await expect(folha.locator('#valor')).toHaveValue('R$ 0,00');
    await expect(folha.locator('#valor')).toBeFocused();
    await expect(folha.getByRole('button', { name: /^Forma de pagamento Cartão de crédito XP/ })).toBeVisible();
    await semViolacoesGraves(page);
  });

  test('guardado: sem rede o lançamento fica no aparelho', async ({ page, context }) => {
    const folha = await abrirFolha(page);
    await preencherCredito3x(page);
    await context.setOffline(true);

    await expect(folha.getByText('Sem conexão. Os lançamentos de despesa ficam guardados no aparelho.')).toBeVisible();
    await folha.getByRole('button', { name: /^Lançar R\$/ }).click();

    await expect(page.getByRole('status').getByText('Guardado no aparelho. Será enviado quando houver conexão.')).toBeVisible();
    await semViolacoesGraves(page);
  });

  test('carregando: "Lançando…" e, depois de 3 s, guardado', async ({ page }) => {
    await page.route('**/rest/v1/rpc/lancar_despesa*', () => new Promise(() => {}));
    const folha = await abrirFolha(page);
    await preencherCredito3x(page);

    await folha.getByRole('button', { name: /^Lançar R\$/ }).click();

    const ocupado = folha.getByRole('button', { name: /Lançando…/ });
    await expect(ocupado).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('dialog', { name: 'Lançar' })).toHaveAttribute('aria-busy', 'true');
    await semViolacoesGraves(page);
    await expect(page.getByRole('status').getByText('Guardado no aparelho.', { exact: false })).toBeVisible({
      timeout: 5000,
    });
  });

  test('erro: envio vazio anuncia o valor, marca a categoria e foca o valor', async ({ page }) => {
    const folha = await abrirFolha(page);

    await folha.getByRole('button', { name: 'Lançar', exact: true }).click();

    await expect(folha.getByRole('alert')).toHaveText('Informe um valor maior que zero.');
    await expect(folha.getByText('Escolha uma categoria.')).toBeVisible();
    await expect(folha.locator('#valor')).toBeFocused();
    await semViolacoesGraves(page);
  });
});

test.describe('teclado virtual', () => {
  test.use({ viewport: { width: 390, height: 500 }, hasTouch: true });

  test('o botão continua visível na janela de 500 px de altura', async ({ page }) => {
    const folha = await abrirFolha(page);

    await expect(folha.getByRole('button', { name: 'Lançar', exact: true })).toBeInViewport();
  });
});
