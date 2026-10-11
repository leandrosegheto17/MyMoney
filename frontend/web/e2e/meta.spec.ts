// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/meta.spec.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: 'celular', width: 390, height: 844 },
  { nome: 'pc', width: 1440, height: 900 },
];
const MOCKUP = join(process.cwd(), '..', '..', '.md', 'mockup');
const ID_VIAGEM = '00000000-0000-4000-8000-000000000902';
const ID_CARRO = '00000000-0000-4000-8000-000000000905';
const lerJson = (arquivo: string) => JSON.parse(readFileSync(join(MOCKUP, 'respostas', arquivo), 'utf8'));
const json = (corpo: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(corpo) });

async function abrir(
  page: Page,
  tamanho: (typeof TAMANHOS)[number],
  { id = ID_VIAGEM, meta = 'meta-detalhe.json', movimentos = 'movimentos-meta.json', pendente = false } = {},
) {
  await page.route('**/rest/v1/rpc/contexto*', (r) => r.fulfill(json(lerJson('contexto.json'))));
  await page.route('**/rest/v1/metas*', (r) => (pendente ? undefined : r.fulfill(json(lerJson(meta)))));
  await page.route('**/rest/v1/rpc/movimentos_meta*', (r) => r.fulfill(json(lerJson(movimentos))));
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto(`/metas/${id}`);
}

for (const tamanho of TAMANHOS) {
  test.describe(`meta ${tamanho.nome}`, () => {
    test('sucesso: resumo, locais, histórico e axe', async ({ page }) => {
      await abrir(page, tamanho);

      await expect(page.getByRole('heading', { level: 1, name: 'Viagem Nordeste' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Faltam' })).toContainText('R$ 5.800,00');
      await expect(page.getByRole('region', { name: 'Onde está guardado' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Histórico' }).getByRole('listitem')).toHaveCount(7);
      await semViolacoesGraves(page);
    });

    test('vazio: estado com Aportar e axe', async ({ page }) => {
      await abrir(page, tamanho, { id: ID_CARRO, meta: 'meta-carro.json', movimentos: 'movimentos-meta-vazio.json' });

      await expect(page.getByRole('heading', { name: 'Nenhum aporte ainda' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Retirar' })).toHaveCount(0);
      await semViolacoesGraves(page);
    });

    test('carregando: aviso para leitor de tela e axe', async ({ page }) => {
      await abrir(page, tamanho, { pendente: true });

      await expect(page.getByText('Carregando a meta…')).toHaveAttribute('role', 'status');
      await expect(page.getByRole('heading', { level: 1, name: 'Meta' })).toBeVisible();
      await semViolacoesGraves(page);
    });

    test('erro: meta que não existe mais e axe', async ({ page }) => {
      await abrir(page, tamanho, { id: '00000000-0000-4000-8000-000000000999', meta: 'metas-vazio.json' });

      await expect(page.getByRole('alert').filter({ hasText: 'Esta meta não existe mais' })).toBeVisible();
      await semViolacoesGraves(page);
    });

    test('Aportar muda a URL e Voltar do navegador a restaura', async ({ page }) => {
      await abrir(page, tamanho);

      await page.getByRole('link', { name: 'Aportar' }).click();
      await expect(page).toHaveURL(new RegExp(`/metas/${ID_VIAGEM}\\?movimentar=aporte$`));
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`/metas/${ID_VIAGEM}$`));
    });
  });
}
