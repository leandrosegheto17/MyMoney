// Mesmo ambiente de lancamentos.spec.ts (Vite em modo de sessão falsa e Supabase falso).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: 'celular', width: 390, height: 844 },
  { nome: 'pc', width: 1440, height: 900 },
];
const RESPOSTAS = join(process.cwd(), '..', '..', '.md', 'mockup', 'respostas');
const ler = (arquivo: string) => readFileSync(join(RESPOSTAS, arquivo), 'utf8');

type Estado = 'sucesso' | 'vazio' | 'pendente' | 'erro';

/** Devolve os corpos das chamadas a `orcamento_mes`, para conferir mês e escopo pedidos. */
async function abrir(page: Page, caminho: string, estado: Estado, largura = 390) {
  const corpos: Record<string, unknown>[] = [];
  await page.route('**/rest/v1/rpc/contexto', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: ler('contexto.json') }),
  );
  await page.route('**/rest/v1/rpc/orcamento_mes*', (rota) => {
    corpos.push((rota.request().postDataJSON() ?? {}) as Record<string, unknown>);
    if (estado === 'pendente') return new Promise(() => {});
    if (estado === 'erro') {
      return rota.fulfill({ status: 503, contentType: 'application/json', body: ler('erro-servico.json') });
    }
    const arquivo = estado === 'vazio' ? 'orcamento-mes-vazio.json' : 'orcamento-mes.json';
    return rota.fulfill({ status: 200, contentType: 'application/json', body: ler(arquivo) });
  });
  await page.setViewportSize({ width: largura, height: 844 });
  await page.goto(caminho);
  return corpos;
}

for (const tamanho of TAMANHOS) {
  test.describe(`orçamento ${tamanho.nome}`, () => {
    test('sucesso: cartões, links de edição, alvos de 44 px e sem violações graves', async ({ page }) => {
      await abrir(page, '/orcamento?mes=2026-10', 'sucesso', tamanho.width);

      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Orçamento de Outubro de 2026');
      await expect(page.getByRole('region', { name: 'Por categoria' })).toBeVisible();
      await expect(page.getByRole('link', { name: /^Editar orçamento de / })).toHaveCount(5);
      for (const alvo of await page.getByRole('main').locator('a, label').all()) {
        expect((await alvo.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
      await semViolacoesGraves(page);
    });

    test('vazio: copiar do mês anterior e sem violações graves', async ({ page }) => {
      await abrir(page, '/orcamento?mes=2026-11', 'vazio', tamanho.width);

      await expect(page.getByRole('heading', { name: 'Sem orçamento da casa em novembro' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Copiar de outubro' })).toBeVisible();
      await semViolacoesGraves(page);
    });

    test('carregando: esqueleto, segmentado visível, main ocupado e sem violações graves', async ({ page }) => {
      await abrir(page, '/orcamento?mes=2026-10', 'pendente', tamanho.width);

      await expect(page.getByText('Carregando o orçamento…')).toBeAttached();
      await expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'true');
      await expect(page.getByRole('radio', { name: 'Casa' })).toBeAttached();
      await semViolacoesGraves(page);
    });

    test('erro: estado de erro com "Tentar de novo" e sem violações graves', async ({ page }) => {
      await abrir(page, '/orcamento?mes=2026-10', 'erro', tamanho.width);

      await expect(page.getByRole('heading', { name: 'Não foi possível carregar' })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('button', { name: /Tentar de novo/ })).toBeVisible();
      await semViolacoesGraves(page);
    });
  });
}

test.describe('orçamento: URL', () => {
  test('trocar o escopo grava na URL e pede o escopo individual', async ({ page }) => {
    const corpos = await abrir(page, '/orcamento?mes=2026-10', 'sucesso');
    await expect(page.getByRole('radio', { name: 'Casa' })).toBeChecked();

    await page.getByText('Eu', { exact: true }).click();

    await expect(page).toHaveURL(/escopo=eu/);
    await expect.poll(() => corpos.some((c) => c.p_escopo === 'individual')).toBe(true);
  });

  test('setas do teclado no segmentado trocam o escopo', async ({ page }) => {
    await abrir(page, '/orcamento?mes=2026-10', 'sucesso');
    await page.getByRole('radio', { name: 'Casa' }).focus();

    await page.keyboard.press('ArrowRight');

    await expect(page.getByRole('radio', { name: 'Eu' })).toBeChecked();
    await expect(page).toHaveURL(/escopo=eu/);
  });

  test('trocar o mês muda a URL e a consulta, mantendo o escopo', async ({ page }) => {
    const corpos = await abrir(page, '/orcamento?mes=2026-10&escopo=eu', 'sucesso');

    await page.getByRole('button', { name: /^Próximo mês/ }).click();

    await expect(page).toHaveURL(/mes=2026-11/);
    await expect(page).toHaveURL(/escopo=eu/);
    await expect.poll(() => corpos.some((c) => c.p_mes === '2026-11-01' && c.p_escopo === 'individual')).toBe(true);
  });
});
