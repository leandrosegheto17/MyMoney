// Mesmo ambiente de lancamentos.spec.ts (Vite em modo de sessão falsa e Supabase falso).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const RESPOSTAS = join(process.cwd(), '..', '..', '.md', 'mockup', 'respostas');
const ler = (arquivo: string) => readFileSync(join(RESPOSTAS, arquivo), 'utf8');
const DEBITO_ITAU = '00000000-0000-4000-8000-000000000302';

/** Responde `lancamentos_mes` com o vazio quando a requisição leva filtro e com a lista quando não leva. */
async function abrir(page: Page, caminho: string) {
  const corpos: Record<string, unknown>[] = [];
  await page.route('**/rest/v1/rpc/contexto', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: ler('contexto.json') }),
  );
  await page.route('**/rest/v1/rpc/dados_lancamento', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: ler('dados-lancamento.json') }),
  );
  await page.route('**/rest/v1/rpc/lancamentos_mes*', (rota) => {
    const corpo = (rota.request().postDataJSON() ?? {}) as Record<string, unknown>;
    corpos.push(corpo);
    const filtrado = corpo.p_forma_id !== undefined;
    return rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ler(filtrado ? 'lancamentos-mes-vazio.json' : 'lancamentos-mes.json'),
    });
  });
  await page.goto(caminho);
  return corpos;
}

test.describe('lançamentos: filtros', () => {
  test('URL com filtros mostra o vazio filtrado e não tem violações graves', async ({ page }) => {
    await abrir(page, `/lancamentos?mes=2026-10&escopo=casa&forma=${DEBITO_ITAU}`);

    await expect(page.getByRole('heading', { name: 'Nenhum lançamento com esses filtros' })).toBeVisible();
    await expect(page.getByText('Em outubro, você não pagou despesas da casa com o Débito Itaú.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Casa' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Forma: Débito Itaú' })).toHaveAttribute('aria-pressed', 'true');
    await semViolacoesGraves(page);
  });

  test('"Limpar filtros" tira os parâmetros da URL e a requisição sai sem filtros', async ({ page }) => {
    const corpos = await abrir(page, `/lancamentos?mes=2026-10&escopo=casa&forma=${DEBITO_ITAU}`);
    await expect(page.getByRole('heading', { name: 'Nenhum lançamento com esses filtros' })).toBeVisible();

    await page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Nenhum lançamento com esses filtros' }) })
      .getByRole('button').click();

    await expect(page).toHaveURL(/\/lancamentos\?mes=2026-10$/);
    await expect(page.getByRole('main').getByRole('listitem').first()).toBeVisible();
    const ultimo = corpos.at(-1) ?? {};
    expect(ultimo.p_forma_id).toBeUndefined();
    expect(ultimo.p_escopo).toBeUndefined();
  });

  test('lista de forma aberta: sem violações graves e a escolha vai para a URL', async ({ page }) => {
    await abrir(page, '/lancamentos?mes=2026-10');

    await page.getByRole('button', { name: 'Forma: todas' }).click();
    await expect(page.getByText('Débito Itaú')).toBeVisible();
    await semViolacoesGraves(page);

    await page.getByText('Débito Itaú').click();
    await expect(page).toHaveURL(new RegExp(`forma=${DEBITO_ITAU}`));
  });
});
