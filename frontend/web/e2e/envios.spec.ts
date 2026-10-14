// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   PORTA=5199 VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/envios.spec.ts
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const MOCKUP = join(process.cwd(), '..', '..', '.md', 'mockup');
const ler = (arquivo: string) => readFileSync(join(MOCKUP, 'respostas', arquivo), 'utf8');
const PRINTS = join(process.cwd(), '..', '..', '.md', '.visual', process.env.DATA_PRINTS ?? 'sem-data', 'envios');

const ERRO_ARQUIVADA = JSON.stringify({ code: 'P0001', message: 'categoria_arquivada', details: null, hint: null });

async function abrirInicio(page: Page, aoEnviar: 'rede' | 'arquivada' | 'credito') {
  for (const [rota, arquivo] of [
    ['contexto', 'contexto.json'],
    ['dados_lancamento', 'dados-lancamento.json'],
    ['resumo_mes*', 'resumo-mes.json'],
  ]) {
    await page.route(`**/rest/v1/rpc/${rota}`, (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: ler(arquivo) }),
    );
  }
  await page.route('**/comparacao/fila-offline*', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: ler('fila-offline.json') }),
  );
  await page.route('**/rest/v1/rpc/lancar_despesa*', (r) => {
    if (aoEnviar === 'rede') return r.abort('failed');
    if (aoEnviar === 'arquivada') {
      return r.fulfill({ status: 400, contentType: 'application/json', body: ERRO_ARQUIVADA });
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: ler('lancar-despesa-credito.json') });
  });
  await page.goto('/?mes=2026-10&envios=1');
}

async function imprimir(page: Page, mockup: string, nome: string) {
  mkdirSync(PRINTS, { recursive: true });
  const tamanho = page.viewportSize();
  const sufixo = `${tamanho?.width}x${tamanho?.height}`;
  await page.getByRole('dialog', { name: 'Envios pendentes' }).screenshot({ path: join(PRINTS, `${nome}-${sufixo}-app.png`) });
  const outra = await page.context().newPage();
  await outra.setViewportSize(tamanho ?? { width: 390, height: 844 });
  await outra.goto(pathToFileURL(join(MOCKUP, 'telas', mockup)).href);
  await outra.locator('section.folha').screenshot({ path: join(PRINTS, `${nome}-${sufixo}-mockup.png`) });
  await outra.close();
}

const TAMANHOS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];

for (const tamanho of TAMANHOS) {
  test.describe(`envios pendentes ${tamanho.width}x${tamanho.height}`, () => {
    test.use({ viewport: tamanho });

    test('sucesso: item aguardando, sem Corrigir, sem violação grave', async ({ page }) => {
      await abrirInicio(page, 'rede');
      const folha = page.getByRole('dialog', { name: 'Envios pendentes' });
      await expect(folha.getByText('Padaria')).toBeVisible();
      await expect(folha.getByText('aguardando envio')).toBeVisible();
      await expect(folha.getByRole('button', { name: /^Corrigir/ })).toHaveCount(0);
      await page.waitForTimeout(500);
      await imprimir(page, 'envios--sucesso.html', 'envios--sucesso');
      await semViolacoesGraves(page);
    });

    test('erro: motivo, Descartar com diálogo e Corrigir abre a T03 preenchida', async ({ page }) => {
      await abrirInicio(page, 'arquivada');
      const folha = page.getByRole('dialog', { name: 'Envios pendentes' });
      await expect(folha.getByRole('status').filter({ hasText: /^Falhou/ })).toHaveText(
        'Falhou: a categoria foi arquivada. Corrija a categoria ou descarte.',
      );
      await page.waitForTimeout(500);
      await imprimir(page, 'envios--erro.html', 'envios--erro');
      await semViolacoesGraves(page);

      await folha.getByRole('button', { name: /^Descartar/ }).click();
      await expect(page.getByRole('alertdialog')).toBeVisible();
      await semViolacoesGraves(page);
      await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar' }).click();
      await expect(folha.getByText('Padaria')).toBeVisible();

      await folha.getByRole('button', { name: /^Corrigir/ }).click();
      const lancar = page.getByRole('dialog', { name: 'Lançar' });
      await expect(lancar).toBeVisible();
      await expect(lancar.locator('#valor')).toHaveValue(/12,50/);
      await expect(page).not.toHaveURL(/envios=1/);
    });
  });
}

test.describe('envio em segundo plano', () => {
  test.use({ viewport: TAMANHOS[0] });

  test('rede volta com resposta de crédito: aviso da 1ª parcela e folha fecha com "Tudo enviado"', async ({ page }) => {
    await abrirInicio(page, 'credito');
    await expect(page.getByRole('status').getByText('Enviado: 1ª parcela em 10/11')).toBeVisible();
    await expect(page.getByRole('status').getByText('Tudo enviado')).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Envios pendentes' })).toHaveCount(0);
  });
});
