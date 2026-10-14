// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   PORTA=5290 VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/lancar-receita.spec.ts
// Com MOCKUP_PRINTS=<pasta> também grava os prints do app e do mockup e compara os dois.
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const MOCKUP = join(process.cwd(), '..', '..', '.md', 'mockup');
const ler = (arquivo: string) => readFileSync(join(MOCKUP, 'respostas', arquivo), 'utf8');
const PASTA_PRINTS = process.env.MOCKUP_PRINTS;

const RESPOSTA_RECEITA = {
  ...JSON.parse(ler('lancar-despesa-credito.json')),
  escopo: 'individual',
  categoria: 'Salário',
  valor_total_centavos: 750000,
  num_parcelas: 1,
  primeira_parcela_data: '2026-10-09',
  ja_existia: false,
};

async function abrirFolhaReceita(page: Page) {
  for (const [rota, arquivo] of [
    ['contexto', 'contexto.json'],
    ['dados_lancamento', 'dados-lancamento.json'],
    ['resumo_mes*', 'resumo-mes.json'],
  ]) {
    await page.route(`**/rest/v1/rpc/${rota}`, (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: ler(arquivo) }),
    );
  }
  await page.goto('/?mes=2026-10');
  await expect(page.locator('#valor')).toBeAttached();
  await page.getByRole('navigation').first().getByRole('link', { name: 'Lançar' }).click();
  await expect(page.getByRole('dialog', { name: 'Lançar' })).toBeVisible();
  await page.waitForTimeout(400);
  await page.getByRole('radio', { name: 'Receita' }).locator('xpath=ancestor::label').click();
  const folha = page.getByRole('dialog', { name: 'Lançar receita' });
  await folha.locator('#valor').click();
  await page.keyboard.type('750000');
  await folha.getByRole('radio', { name: /Salário/ }).locator('xpath=ancestor::label').click();
  return folha;
}

/** Print da folha com o recorte em pixels inteiros, para a posição fracionária não deslocar a comparação. */
async function imprimir(pagina: Page, seletor: string, arquivo: string): Promise<Buffer> {
  const caixa = (await pagina.locator(seletor).boundingBox())!;
  const x = Math.floor(caixa.x);
  const y = Math.floor(caixa.y);
  const clip = { x, y, width: Math.ceil(caixa.x + caixa.width) - x, height: Math.ceil(caixa.y + caixa.height) - y };
  return pagina.screenshot({ path: arquivo, clip });
}

/** Percentual de pixels diferentes entre dois PNGs, calculado no navegador. */
async function diferenca(page: Page, a: Buffer, b: Buffer): Promise<{ percentual: number; alturas: number[] }> {
  return page.evaluate(
    async ([x, y]) => {
      const carregar = (b64: string) =>
        new Promise<HTMLImageElement>((ok) => {
          const img = new Image();
          img.onload = () => ok(img);
          img.src = `data:image/png;base64,${b64}`;
        });
      const [ia, ib] = await Promise.all([carregar(x), carregar(y)]);
      const largura = Math.max(ia.width, ib.width);
      const altura = Math.max(ia.height, ib.height);
      const dados = (img: HTMLImageElement, dy: number) => {
        const c = document.createElement('canvas');
        c.width = largura;
        c.height = altura;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, dy);
        return ctx.getImageData(0, 0, largura, altura).data;
      };
      const da = dados(ia, 0);
      // A posição fracionária da folha pode deslocar o print em 1 px; vale o melhor alinhamento.
      const percentuais = [0, 1, -1].map((dy) => {
        const db = dados(ib, dy);
        let diferentes = 0;
        for (let i = 0; i < da.length; i += 4) {
          const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
          if (d / 255 > 0.1) diferentes++;
        }
        return (diferentes / (largura * altura)) * 100;
      });
      return { percentual: Math.min(...percentuais), alturas: [ia.height, ib.height] };
    },
    [a.toString('base64'), b.toString('base64')],
  );
}

const TAMANHOS = [
  ['celular', { width: 390, height: 844 }],
  ['pc', { width: 1440, height: 900 }],
] as const;

for (const [nome, viewport] of TAMANHOS) {
  test.describe(`lançar receita (${nome})`, () => {
    test.use({ viewport, hasTouch: nome === 'celular' });

    test('estado manual: sem violação grave e parecido com o mockup', async ({ page, browser }) => {
      const folha = await abrirFolhaReceita(page);
      await expect(folha.getByRole('button', { name: /^Lançar receita R\$/ })).toBeVisible();
      await expect(folha.getByRole('radiogroup', { name: 'Categoria de receita' })).toBeVisible();
      await expect(folha.getByRole('button', { name: /^Conta de destino Nubank/ })).toBeVisible();
      await semViolacoesGraves(page);

      if (!PASTA_PRINTS) return;
      mkdirSync(PASTA_PRINTS, { recursive: true });
      const app = await imprimir(page, '[role=dialog]', join(PASTA_PRINTS, `app-${nome}.png`));
      const paginaMockup = await (await browser.newContext({ viewport })).newPage();
      await paginaMockup.goto(pathToFileURL(join(MOCKUP, 'telas', 'lancar--receita.html')).href);
      await paginaMockup.waitForTimeout(400);
      const mockup = await imprimir(paginaMockup, 'section.folha', join(PASTA_PRINTS, `mockup-${nome}.png`));
      const { percentual, alturas } = await diferenca(page, app, mockup);
      console.log(`DIFERENCA ${nome}: ${percentual.toFixed(2)}% alturas app/mockup ${alturas.join('/')}`);
      expect(percentual).toBeLessThanOrEqual(1);
    });

    test('sucesso: aviso, valor e categoria limpos, receita e conta mantidas', async ({ page }) => {
      await page.route('**/rest/v1/rpc/lancar_receita*', (r) =>
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(RESPOSTA_RECEITA) }),
      );
      const folha = await abrirFolhaReceita(page);

      await folha.getByRole('button', { name: /^Lançar receita R\$/ }).click();

      await expect(page.getByRole('status').getByText('Lançado: R$ 7.500,00 · Salário · Eu')).toBeVisible();
      await expect(folha.locator('#valor')).toHaveValue('R$ 0,00');
      await expect(folha.locator('#valor')).toBeFocused();
      await expect(folha.getByRole('button', { name: /^Conta de destino Nubank/ })).toBeVisible();
    });

    test('sem rede: avisa, mantém os dados e não chama lancar_despesa', async ({ page, context }) => {
      const chamadasDespesa: string[] = [];
      page.on('request', (r) => {
        if (r.url().includes('/rpc/lancar_despesa')) chamadasDespesa.push(r.url());
      });
      const folha = await abrirFolhaReceita(page);
      await context.setOffline(true);

      await folha.getByRole('button', { name: /^Lançar receita R\$/ }).click();

      await expect(folha.getByRole('alert')).toHaveText('Sem conexão. A receita não foi salva');
      await expect(folha.locator('#valor')).toHaveValue(/7\.500,00/);
      await expect(folha.getByRole('radio', { name: /Salário/ })).toBeChecked();
      expect(chamadasDespesa).toEqual([]);
      await semViolacoesGraves(page);
    });
  });
}
