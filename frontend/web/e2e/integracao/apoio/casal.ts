// Duas sessões (A e B) em contextos separados, o coletor de rede de B e a preparação feita por A.
import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { fecharFolhaLancar, lancarPelaFolha } from './lancar';
import { mesAtual, mesDaPrimeiraParcela, somarMeses } from './meses';
import { entrarComo, type Quem } from './sessao';

export interface Sessoes {
  a: Page;
  b: Page;
  fechar: () => Promise<void>;
}

async function abrirSessao(browser: Browser, quem: Quem): Promise<{ contexto: BrowserContext; page: Page }> {
  const contexto = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await contexto.newPage();
  await entrarComo(page, quem);
  return { contexto, page };
}

/** Cookies e armazenamento separados: A e B entram ao mesmo tempo, cada um no seu contexto. */
export async function abrirSessoes(browser: Browser): Promise<Sessoes> {
  const a = await abrirSessao(browser, 'A');
  const b = await abrirSessao(browser, 'B');
  return { a: a.page, b: b.page, fechar: async () => void (await Promise.all([a.contexto.close(), b.contexto.close()])) };
}

/** Guarda o corpo de toda resposta de `/rest/v1/` da página: o que o servidor entregou, visível ou não. */
export function coletarRespostasRest(page: Page) {
  const corpos: Promise<string>[] = [];
  page.on('response', (resposta) => {
    if (!new URL(resposta.url()).pathname.startsWith('/rest/v1/')) return;
    corpos.push(resposta.text().catch(() => ''));
  });
  return {
    /** Trechos proibidos que aparecem em alguma resposta, sem diferenciar maiúsculas. */
    async encontrar(proibidos: string[]): Promise<string[]> {
      const todos = (await Promise.all(corpos)).join('\n').toLowerCase();
      return proibidos.filter((p) => todos.includes(p.toLowerCase()));
    },
    quantidade: () => corpos.length,
  };
}

export interface Compra {
  /** Descrição lançada: acha a compra nas listas. */
  marcador: string;
  /** Id do lançamento, lido do `p_id` enviado pela folha. */
  id: string;
  /** Meses ('AAAA-MM') em que há parcela. */
  meses: string[];
}

/** Lança pela folha e devolve a compra com o id da rodada de lançamentos criados. */
export async function lancarCompra(
  a: Page,
  criados: string[],
  lancamento: Parameters<typeof lancarPelaFolha>[1] & { descricao: string },
): Promise<Compra> {
  const antes = criados.length;
  await lancarPelaFolha(a, lancamento);
  const parcelas = lancamento.parcelas ?? 1;
  let meses = [mesAtual];
  if (parcelas > 1) {
    const primeiro = await mesDaPrimeiraParcela(a);
    meses = Array.from({ length: parcelas }, (_, i) => somarMeses(primeiro, i));
  } else {
    await expect(a.getByRole('status').getByText(/^Lançado: R\$/)).toBeVisible();
  }
  await expect.poll(() => criados.length).toBe(antes + 1);
  await fecharFolhaLancar(a);
  return { marcador: lancamento.descricao, id: criados[antes], meses };
}

export const MENSAGEM_NAO_EXISTE = 'Este lançamento não existe mais';

/** Ids das formas e contas de A no seed (supabase/seeds/02-contas.sql e 03-formas.sql): B nunca os recebe. */
export const IDS_FORMAS_E_CONTAS_DE_A = [
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000202',
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000302',
  '00000000-0000-4000-8000-000000000303',
];

export const NOMES_FORMAS_E_CONTAS_DE_A = ['Cartão de crédito XP', 'Débito Itaú', 'Pix Nubank', 'Nubank', 'Itaú'];
