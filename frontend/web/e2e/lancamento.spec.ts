// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/lancamento.spec.ts
// PASTA_PRINTS=<pasta> grava o app e o mockup do estado de descarte.
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
const ler = (arquivo: string) => readFileSync(join(MOCKUP, 'respostas', arquivo), 'utf8');
const json = (corpo: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(corpo) });

async function abrir(
  page: Page,
  tamanho: (typeof TAMANHOS)[number],
  { lancamento = 'lancamento-pagador.json', contexto = 'contexto.json', id = ID } = {},
) {
  await page.route('**/rest/v1/rpc/contexto*', (r) => r.fulfill(json(JSON.parse(ler(contexto)))));
  await page.route('**/rest/v1/rpc/dados_lancamento*', (r) => r.fulfill(json(JSON.parse(ler('dados-lancamento.json')))));
  await page.route('**/rest/v1/rpc/lancamento*', (r) =>
    id === ID ? r.fulfill(json(JSON.parse(ler(lancamento)))) : r.fulfill(json(JSON.parse(ler('erro-registro-invalido.json')), 400)),
  );
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto(`/lancamentos/${id}`);
}

for (const tamanho of TAMANHOS) {
  test.describe(`lancamento ${tamanho.nome}`, () => {
    test('pagador: seis campos, parcelas e axe', async ({ page }) => {
      await abrir(page, tamanho);

      await expect(page.getByRole('region', { name: 'Resumo' })).toContainText('Geladeira nova (2/3)');
      await expect(page.getByLabel('Valor total da compra')).toHaveValue(/1\.950,00/);
      await expect(page.getByLabel('Data da compra')).toBeVisible();
      await expect(page.locator('#parcelas')).toBeVisible();
      await expect(page.getByRole('button', { name: /Forma de pagamento/ })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Parcelas' })).toBeVisible();
      await semViolacoesGraves(page);
    });

    test('outro membro: sem data, parcelas nem forma, e a nota', async ({ page }) => {
      await abrir(page, tamanho, { lancamento: 'lancamento-outro-membro.json', contexto: 'contexto-ana.json' });

      await expect(page.getByText('Forma de pagamento e parcelas: só quem pagou pode alterar.')).toBeVisible();
      await expect(page.getByLabel('Data da compra')).toHaveCount(0);
      await expect(page.locator('#parcelas')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Forma de pagamento/ })).toHaveCount(0);
      await semViolacoesGraves(page);
    });

    test('não existe mais: estado de erro com Voltar e axe', async ({ page }) => {
      await abrir(page, tamanho, { id: '00000000-0000-4000-8000-000000000599' });

      await expect(page.getByRole('alert').filter({ hasText: 'Este lançamento não existe mais' })).toBeVisible();
      await semViolacoesGraves(page);
    });

    test('descarte: valor alterado abre o diálogo I-21 e "Recalcular e salvar" reenvia', async ({ page }) => {
      const envios: Record<string, unknown>[] = [];
      await page.route('**/rest/v1/rpc/editar_lancamento*', (r) => {
        const corpo = r.request().postDataJSON() as Record<string, unknown>;
        envios.push(corpo);
        return corpo.p_confirmar_descarte
          ? r.fulfill(json(null, 200))
          : r.fulfill(json({ message: 'confirmar_descarte_ajustes' }, 400));
      });
      await abrir(page, tamanho);

      await page.getByLabel('Valor total da compra').fill('R$ 2.000,00');
      await page.getByRole('button', { name: 'Salvar alterações' }).click();

      const dialogo = page.getByRole('alertdialog', { name: 'Descartar ajuste de data?' });
      await expect(dialogo).toContainText('A parcela 3/3 teve a data ajustada à mão (17/11).');
      await page.waitForTimeout(300);
      await semViolacoesGraves(page);

      if (PASTA_PRINTS) {
        mkdirSync(PASTA_PRINTS, { recursive: true });
        await page.screenshot({ path: join(PASTA_PRINTS, `lancamento--descarte-${tamanho.nome}--app.png`), fullPage: true });
        const mockup = await page.context().newPage();
        await mockup.setViewportSize({ width: tamanho.width, height: tamanho.height });
        await mockup.goto(pathToFileURL(join(MOCKUP, 'telas', 'lancamento--descarte.html')).href);
        await mockup.screenshot({ path: join(PASTA_PRINTS, `lancamento--descarte-${tamanho.nome}--mockup.png`), fullPage: true });
      }

      await dialogo.getByRole('button', { name: 'Recalcular e salvar' }).click();
      await expect.poll(() => envios.length).toBe(2);
      expect(envios[0].p_valor_total_centavos).toBe(200000);
      expect(envios[0].p_confirmar_descarte).toBe(false);
      expect(envios[1].p_confirmar_descarte).toBe(true);
    });
  });
}
