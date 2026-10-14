// @integracao: usa o Supabase local (só localhost) e o usuário Leandro do seed.
//   pnpm local:subir   (ou `supabase start --workdir backend`)
//   PORTA=5292 pnpm exec playwright test --grep @integracao e2e/integracao/lancar-receita.spec.ts
// A URL e a chave vêm de .env.local; e-mail e senha do seed, de TESTE_EMAIL_A e TESTE_SENHA
// (valores em backend/.env.example, exportados no ambiente). Host não local ou variável ausente
// derruba o spec antes de qualquer gravação.
import { expect, test, type Page } from '@playwright/test';
import { excluirLancamentosLocais, lerEnvLocal, registrarLancamentosCriados } from '../apoio/limpeza-local';
import { lerAmbienteIntegracao } from './apoio/ambiente';

const { emailA: EMAIL, senha: SENHA } = lerAmbienteIntegracao(lerEnvLocal());

const emCentavos = (texto: string) => {
  const numero = texto.replace(/[^\d,-]/g, '').replace(',', '.');
  return Math.round(Number(numero) * 100);
};

async function entrar(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(EMAIL);
  await page.getByLabel('Senha', { exact: true }).fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { level: 1 }).first()).not.toHaveText('Entrar');
}

async function receitasDoMes(page: Page) {
  const valor = page.locator('dt', { hasText: /^Receitas$/ }).locator('xpath=following-sibling::dd');
  await expect(valor).toBeVisible();
  return emCentavos((await valor.textContent()) ?? '');
}

async function saldoDaConta(page: Page, nome: string) {
  const linha = page.getByRole('link', { name: new RegExp(nome) }).first();
  await expect(linha).toBeVisible();
  const textos = await linha.locator('.valor, [class*="valor"]').allTextContents();
  return emCentavos(textos[textos.length - 1] ?? '');
}

test.describe('@integracao lançar receita', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  let criados: string[] = [];
  test.afterEach(async () => {
    await excluirLancamentosLocais(criados, EMAIL, SENHA);
  });

  test('a receita de R$ 100,00 sobe o saldo da conta e as receitas do mês', async ({ page }) => {
    criados = registrarLancamentosCriados(page);
    await entrar(page);
    await page.goto('/');
    const receitasAntes = await receitasDoMes(page);

    await page.getByRole('navigation').first().getByRole('link', { name: 'Lançar' }).click();
    const folha = page.getByRole('dialog', { name: 'Lançar' });
    await expect(folha).toBeVisible();
    await folha.getByRole('radio', { name: 'Receita' }).locator('xpath=ancestor::label').click();
    const receita = page.getByRole('dialog', { name: 'Lançar receita' });
    const conta = (await receita.getByRole('button', { name: /^Conta de destino/ }).textContent())!
      .replace('Conta de destino', '')
      .trim();
    await page.goto('/');
    const saldoAntes = await saldoDaConta(page, conta);

    await page.getByRole('navigation').first().getByRole('link', { name: 'Lançar' }).click();
    await page.getByRole('radio', { name: 'Receita' }).locator('xpath=ancestor::label').click();
    await page.locator('#valor').click();
    await page.keyboard.type('10000');
    await page.getByRole('radio', { name: /Salário/ }).locator('xpath=ancestor::label').click();
    await page.getByRole('button', { name: /^Lançar receita R\$/ }).click();
    await expect(page.getByRole('status').getByText(/^Lançado: R\$ 100,00 · Salário/)).toBeVisible();

    await page.goto('/');
    await expect.poll(() => receitasDoMes(page)).toBe(receitasAntes + 10000);
    await expect.poll(() => saldoDaConta(page, conta)).toBe(saldoAntes + 10000);
  });
});
