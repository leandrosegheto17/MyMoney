// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/pagar-fixa.spec.ts
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: 'celular', width: 390, height: 844 },
  { nome: 'pc', width: 1440, height: 900 },
];
const RAIZ = join(process.cwd(), '..', '..');
const RESPOSTAS = join(RAIZ, '.md', 'mockup', 'respostas');
const ler = (arquivo: string) => readFileSync(join(RESPOSTAS, arquivo), 'utf8');
const PASTA_PRINTS = join(RAIZ, '.md', '.visual', new Date().toISOString().slice(0, 10), 'TP-0132');
const ID_INTERNET = '00000000-0000-4000-8000-000000000804';

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number], formas = 'dados-lancamento.json') {
  const json = (corpo: string) => ({ status: 200, contentType: 'application/json', body: corpo });
  await page.route('**/rest/v1/rpc/contexto*', (rota) => rota.fulfill(json(ler('contexto.json'))));
  await page.route('**/rest/v1/rpc/dados_lancamento*', (rota) => rota.fulfill(json(ler(formas))));
  await page.route('**/rest/v1/rpc/ocorrencias_mes*', (rota) => rota.fulfill(json(ler('ocorrencias-mes.json'))));
  await page.route('**/rest/v1/despesas_fixas*', (rota) => rota.fulfill(json(ler('despesas-fixas.json'))));
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto('/fixas?mes=2026-10');
  await expect(page.getByRole('heading', { name: /Pagas: 4 de 7/ })).toBeVisible();
}

for (const tamanho of TAMANHOS) {
  test.describe(`marcar fixa como paga ${tamanho.nome}`, () => {
    test('sucesso: abre pelo gatilho, sem violações graves; Esc fecha e devolve o foco', async ({ page }) => {
      await abrir(page, tamanho);
      const gatilho = page.getByRole('link', { name: 'Marcar como paga: Internet' });
      await gatilho.click();

      const folha = page.getByRole('dialog', { name: 'Marcar como paga' });
      await expect(folha).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`pagar=${ID_INTERNET}`));
      await expect(folha.getByText(/^Se pagar no cartão de crédito/)).toBeVisible();
      await semViolacoesGraves(page);

      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab');
        expect(await folha.evaluate((el) => el.contains(document.activeElement))).toBe(true);
      }

      await page.keyboard.press('Escape');
      await expect(folha).toBeHidden();
      await expect(page).not.toHaveURL(/pagar=/);
      await expect(gatilho).toBeFocused();
    });

    test('vazio: atalho para cadastrar forma e sem violações graves', async ({ page }) => {
      await abrir(page, tamanho, 'dados-lancamento-sem-formas.json');
      await page.getByRole('link', { name: 'Marcar como paga: Internet' }).click();

      const folha = page.getByRole('dialog', { name: 'Marcar como paga' });
      await expect(folha.getByRole('heading', { level: 3, name: 'Você ainda não tem forma de pagamento' })).toBeVisible();
      await expect(folha.getByRole('link', { name: 'Cadastrar forma' })).toHaveAttribute('href', '/ajustes/formas/nova');
      await expect(folha.getByRole('button', { name: 'Confirmar pagamento' })).toHaveCount(0);
      await semViolacoesGraves(page);
    });

    test('erro sem rede: avisa, mantém forma e valor, sem violações graves', async ({ page }) => {
      await page.route('**/rest/v1/rpc/pagar_ocorrencia*', (rota) => rota.abort('internetdisconnected'));
      await abrir(page, tamanho);
      await page.getByRole('link', { name: 'Marcar como paga: Internet' }).click();

      const folha = page.getByRole('dialog', { name: 'Marcar como paga' });
      await folha.getByRole('button', { name: /Forma de pagamento/ }).click();
      await folha.getByText('Débito Itaú').click();
      const valor = folha.getByLabel('Valor pago');
      await valor.fill('');
      await valor.pressSequentially('12490');
      await folha.getByRole('button', { name: 'Confirmar pagamento' }).click();

      const aviso = folha.getByRole('alert');
      await expect(aviso).toHaveText(
        'Sem conexão. O pagamento não foi registrado. Seus dados continuam aqui: tente de novo quando a rede voltar.',
      );
      await expect(valor).toHaveValue(/124,90/);
      await expect(folha.getByRole('button', { name: /Forma de pagamento\s*Débito Itaú/ })).toBeVisible();
      await expect(folha.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
      await semViolacoesGraves(page);

      mkdirSync(PASTA_PRINTS, { recursive: true });
      await folha.screenshot({ path: join(PASTA_PRINTS, `e2e-pagar-fixa-erro-${tamanho.nome}.png`) });
    });
  });
}
