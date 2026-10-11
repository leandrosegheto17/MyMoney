// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/lancamento-parcelas.spec.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: 'celular', width: 390, height: 844 },
  { nome: 'pc', width: 1440, height: 900 },
];
const MOCKUP = join(process.cwd(), '..', '..', '.md', 'mockup');
const ID = '00000000-0000-4000-8000-000000000520';
const ID_PARCELA_2 = '00000000-0000-4000-8000-000000000621';
const ler = (arquivo: string) => JSON.parse(readFileSync(join(MOCKUP, 'respostas', arquivo), 'utf8')) as unknown;
const json = (corpo: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(corpo) });

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number], detalhe: string, ajustes: unknown[] = []) {
  await page.route('**/rest/v1/rpc/contexto*', (r) => r.fulfill(json(ler('contexto.json'))));
  await page.route('**/rest/v1/rpc/dados_lancamento*', (r) => r.fulfill(json(ler('dados-lancamento.json'))));
  await page.route('**/rest/v1/rpc/lancamento*', (r) => r.fulfill(json(ler(detalhe))));
  await page.route('**/rest/v1/rpc/alterar_data_parcela*', (r) => {
    ajustes.push(r.request().postDataJSON());
    return r.fulfill(json(null));
  });
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto(`/lancamentos/${ID}`);
  await expect(page.getByRole('region', { name: 'Parcelas' })).toBeVisible();
}

const ESTILOS = ['color', 'fontWeight', 'fontSize', 'lineHeight', 'paddingLeft', 'paddingRight'] as const;
async function estilos(pagina: Page, seletor: string) {
  return pagina.locator(seletor).first().evaluate((el, props) => {
    const c = getComputedStyle(el);
    const caixa = el.getBoundingClientRect();
    return { ...Object.fromEntries(props.map((p) => [p, c[p as never]])), largura: Math.round(caixa.width), altura: Math.round(caixa.height) };
  }, [...ESTILOS]);
}

for (const tamanho of TAMANHOS) {
  test.describe(`lancamento parcelas ${tamanho.nome}`, () => {
    test('pagador: estilos de "Alterar data" e do selo iguais aos do mockup, axe', async ({ page }) => {
      await abrir(page, tamanho, 'lancamento-pagador.json');
      const mockup = await page.context().newPage();
      await mockup.setViewportSize({ width: tamanho.width, height: tamanho.height });
      await mockup.goto(pathToFileURL(join(MOCKUP, 'telas', 'lancamento--sucesso.html')).href);

      for (const seletor of ['ul li:nth-child(3) button', 'ul li:nth-child(3) >> text=data ajustada', 'ul li:nth-child(1) > span:first-child']) {
        const completo = `section[aria-labelledby] ${seletor}`;
        expect(await estilos(page, completo), seletor).toEqual(await estilos(mockup, completo));
      }
      await semViolacoesGraves(page);
    });

    test('escolher a data salva só aquela parcela e avisa', async ({ page }) => {
      const ajustes: unknown[] = [];
      await abrir(page, tamanho, 'lancamento-pagador.json', ajustes);
      await page.getByRole('button', { name: 'Alterar data da parcela 2 de 3' }).click();
      await page.getByLabel('Nova data da parcela 2 de 3').fill('2026-11-05');

      await expect(page.getByText('Data da parcela alterada')).toBeVisible();
      expect(ajustes).toEqual([{ p_parcela_id: ID_PARCELA_2, p_data: '2026-11-05' }]);
    });

    test('outro membro: sem botão nem selo, axe', async ({ page }) => {
      await abrir(page, tamanho, 'lancamento-outro-membro.json');
      await expect(page.getByRole('button', { name: /Alterar data/ })).toHaveCount(0);
      await expect(page.getByText('data ajustada')).toHaveCount(0);
      await semViolacoesGraves(page);
    });
  });
}
