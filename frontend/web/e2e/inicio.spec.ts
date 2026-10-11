// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/inicio.spec.ts
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

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number], resumo: 'pendente' | 'indisponivel') {
  await page.route('**/rest/v1/rpc/contexto', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: ler('contexto.json') }),
  );
  await page.route('**/rest/v1/rpc/resumo_mes*', (rota) =>
    resumo === 'pendente'
      ? new Promise(() => {})
      : rota.fulfill({ status: 503, contentType: 'application/json', body: ler('erro-servico.json') }),
  );
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto('/?mes=2026-10');
}

for (const tamanho of TAMANHOS) {
  test.describe(`início ${tamanho.nome}`, () => {
    test('carregando: esqueleto dos dois blocos, main ocupado e sem violações graves', async ({ page }) => {
      await abrir(page, tamanho, 'pendente');

      await expect(page.getByText('Carregando o resumo de outubro…')).toBeAttached();
      await expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'true');
      await expect(page.locator('#titulo-casa, #titulo-eu')).toHaveCount(0);
      await semViolacoesGraves(page);
    });

    test('erro 503: "Servidor indisponível", nova tentativa e sem violações graves', async ({ page }) => {
      await abrir(page, tamanho, 'indisponivel');

      // O TanStack tenta de novo antes de desistir (cerca de 7 s).
      await expect(page.getByRole('heading', { name: 'Servidor indisponível' })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
      await semViolacoesGraves(page);
    });
  });
}
