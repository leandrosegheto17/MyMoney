// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/lancamento-excluir.spec.ts
// PASTA_PRINTS=<pasta> grava o app e o mockup do estado de exclusão.
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: 'celular', width: 390, height: 844 },
  { nome: 'pc', width: 1440, height: 900 },
];
const MOCKUP = join(process.cwd(), '..', '..', '.md', 'mockup');
const PASTA_PRINTS = process.env.PASTA_PRINTS;
const ID = '00000000-0000-4000-8000-000000000520';
const TITULO = 'Excluir esta compra e as 3 parcelas?';
const ler = (arquivo: string) => JSON.parse(readFileSync(join(MOCKUP, 'respostas', arquivo), 'utf8')) as unknown;
const json = (corpo: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(corpo) });

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number], respostaExcluir: ReturnType<typeof json>, chamadas: string[]) {
  await page.route('**/rest/v1/rpc/contexto*', (r) => r.fulfill(json(ler('contexto.json'))));
  await page.route('**/rest/v1/rpc/dados_lancamento*', (r) => r.fulfill(json(ler('dados-lancamento.json'))));
  await page.route('**/rest/v1/rpc/lancamento*', (r) => r.fulfill(json(ler('lancamento-pagador.json'))));
  await page.route('**/rest/v1/rpc/excluir_lancamento*', (r) => {
    chamadas.push(r.request().url());
    return r.fulfill(respostaExcluir);
  });
  await page.route('**/rest/v1/rpc/lancamentos_mes*', (r) => r.fulfill(json(ler('lancamentos-mes.json'))));
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto(`/lancamentos/${ID}`);
  await page.getByRole('button', { name: 'Excluir' }).click();
}

for (const tamanho of TAMANHOS) {
  test.describe(`lancamento excluir ${tamanho.nome}`, () => {
    test('diálogo de confirmação: texto do mockup, axe e Cancelar não exclui', async ({ page }) => {
      const chamadas: string[] = [];
      await abrir(page, tamanho, json(null), chamadas);

      const dialogo = page.getByRole('alertdialog', { name: TITULO });
      await expect(dialogo).toContainText('Geladeira nova, R$ 1.950,00 em 3x. A exclusão vale para os dois e não pode ser desfeita.');
      await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused();
      await page.waitForTimeout(300);
      await semViolacoesGraves(page);

      if (PASTA_PRINTS) {
        mkdirSync(PASTA_PRINTS, { recursive: true });
        await page.screenshot({ path: join(PASTA_PRINTS, `lancamento--excluir-${tamanho.nome}--app.png`), fullPage: true });
        const mockup = await page.context().newPage();
        await mockup.setViewportSize({ width: tamanho.width, height: tamanho.height });
        await mockup.goto(pathToFileURL(join(MOCKUP, 'telas', 'lancamento--excluir.html')).href);
        await mockup.screenshot({ path: join(PASTA_PRINTS, `lancamento--excluir-${tamanho.nome}--mockup.png`), fullPage: true });
      }

      await dialogo.getByRole('button', { name: 'Cancelar' }).click();
      await expect(dialogo).toHaveCount(0);
      expect(chamadas).toHaveLength(0);
    });

    test('confirmar exclui, avisa "Excluído" e volta à lista', async ({ page }) => {
      const chamadas: string[] = [];
      await abrir(page, tamanho, json(null), chamadas);
      await page.getByRole('alertdialog', { name: TITULO }).getByRole('button', { name: 'Excluir' }).click();

      await expect(page).toHaveURL(/\/lancamentos(\?|$)/);
      await expect(page.getByText('Excluído')).toBeVisible();
      expect(chamadas).toHaveLength(1);
    });

    test('outro membro já excluiu: "não existe mais" e axe', async ({ page }) => {
      const chamadas: string[] = [];
      await abrir(page, tamanho, json(ler('erro-registro-invalido.json'), 400), chamadas);
      await page.getByRole('alertdialog', { name: TITULO }).getByRole('button', { name: 'Excluir' }).click();

      await expect(page.getByRole('alert').filter({ hasText: 'Este lançamento não existe mais' })).toBeVisible();
      await semViolacoesGraves(page);
    });
  });
}
