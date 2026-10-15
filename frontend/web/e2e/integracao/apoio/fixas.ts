// Leituras e ações das despesas fixas (T06, T07, T08), do Início (T02) e do cartão (T18) reais.
import { expect, type Locator, type Page } from '@playwright/test';
import { emCentavos } from './leitura';

/** Hoje em America/Sao_Paulo, como o app o enxerga, independente do fuso da máquina. */
export function hojeSaoPaulo(): { iso: string; mes: string; dia: number } {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const iso = `${partes.year}-${partes.month}-${partes.day}`;
  return { iso, mes: iso.slice(0, 7), dia: Number(partes.day) };
}

/** "Total do casal" da T02 de um mês ('AAAA-MM'), em centavos. */
export async function totalDoCasal(page: Page, mes: string): Promise<number> {
  await page.goto(`/?mes=${mes}`);
  const valor = page.getByRole('article', { name: 'Total do casal' }).locator('p').first();
  await expect(valor).toBeVisible({ timeout: 15_000 });
  return emCentavos((await valor.textContent()) ?? '');
}

/** Fixas ainda a pagar ("N de M" do cartão "Fixas a pagar") da T02 de um mês; sem contador, nenhuma. */
export async function fixasAPagarNaT02(page: Page, mes: string): Promise<number> {
  await page.goto(`/?mes=${mes}`);
  await expect(page.getByRole('article', { name: 'Total do casal' })).toBeVisible({ timeout: 15_000 });
  const cartao = page.getByRole('article', { name: /^Fixas a pagar/ });
  await expect(cartao).toBeVisible({ timeout: 15_000 });
  const contador = /(\d+) de \d+/.exec((await cartao.getByRole('heading').textContent()) ?? '');
  return contador ? Number(contador[1]) : 0;
}

/** "Neste mês" e "Próximos meses" do cartão de crédito (T18), em centavos. */
export async function totaisDoCartao(page: Page, idForma: string, nome: string) {
  await page.goto(`/ajustes/formas/${idForma}`);
  const quadro = page.getByRole('region', { name: nome });
  const ler = async (rotulo: RegExp) => {
    const valor = quadro.locator('dt', { hasText: rotulo }).locator('xpath=following-sibling::dd');
    await expect(valor).toBeVisible({ timeout: 15_000 });
    return emCentavos((await valor.textContent()) ?? '');
  };
  return { nesteMes: await ler(/^Neste mês/), proximosMeses: await ler(/^Próximos meses$/) };
}

/** Cartão "Pagas: N de M" da T06 de um mês; as ocorrências ficam nele, os modelos fora. */
export async function abrirFixasDoMes(page: Page, mes: string): Promise<Locator> {
  await page.goto(`/fixas?mes=${mes}`);
  const cartao = page.getByRole('region', { name: /^Pagas:/ });
  await expect(cartao).toBeVisible({ timeout: 15_000 });
  return cartao;
}

/** Linha da ocorrência de um marcador na T06 de um mês. */
export async function ocorrenciaDoMes(page: Page, mes: string, marcador: string): Promise<Locator> {
  const cartao = await abrirFixasDoMes(page, mes);
  return cartao.getByRole('listitem').filter({ hasText: marcador });
}

/** T07: cria o modelo e espera o aviso e a volta à T06. */
export async function criarModeloFixa(
  page: Page,
  modelo: { descricao: string; categoria: string; valorCentavos: number; dia: number },
): Promise<void> {
  await page.goto('/fixas');
  await page.getByRole('link', { name: 'Nova despesa fixa' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Nova despesa fixa' })).toBeVisible({ timeout: 15_000 });
  await page.getByLabel('Descrição', { exact: true }).fill(modelo.descricao);
  await page.getByLabel('Categoria da casa').selectOption({ label: modelo.categoria });
  await page.getByLabel('Valor previsto').click();
  await page.keyboard.type(String(modelo.valorCentavos));
  await page.getByLabel('Dia de vencimento').fill(String(modelo.dia));
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('status').getByText('Despesa fixa salva')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Despesas fixas' })).toBeVisible({ timeout: 15_000 });
}

/** T08 pela T06: escolhe a forma, mantém o valor e confirma com a data dada. */
export async function pagarOcorrencia(page: Page, mes: string, marcador: string, forma: string, data: string) {
  await abrirFixasDoMes(page, mes);
  await page.getByRole('link', { name: `Marcar como paga: ${marcador}` }).click();
  const folha = page.getByRole('dialog', { name: 'Marcar como paga' });
  await expect(folha).toBeVisible({ timeout: 15_000 });
  await folha.getByRole('button', { name: /^Forma de pagamento/ }).click();
  await page.getByRole('radio', { name: new RegExp(forma) }).locator('xpath=ancestor::label').click();
  await folha.getByLabel('Data do pagamento').fill(data);
  await folha.getByRole('button', { name: 'Confirmar pagamento' }).click();
  await expect(page.getByRole('status').getByText('Marcada como paga')).toBeVisible({ timeout: 15_000 });
}

/** T06: desfaz o pagamento pelo diálogo de confirmação. */
export async function desfazerPagamento(page: Page, mes: string, marcador: string) {
  await abrirFixasDoMes(page, mes);
  await page.getByRole('button', { name: `Desfazer pagamento: ${marcador}` }).click();
  const dialogo = page.getByRole('alertdialog');
  await expect(dialogo).toBeVisible({ timeout: 15_000 });
  await dialogo.getByRole('button', { name: 'Desfazer pagamento' }).click();
  await expect(page.getByRole('status').getByText('Pagamento desfeito')).toBeVisible({ timeout: 15_000 });
}

/** Encerra o modelo pela T07 (limpeza: o marcador não volta a gerar ocorrências). */
export async function encerrarModeloFixa(page: Page, marcador: string) {
  await page.goto('/fixas');
  await page.getByRole('link', { name: new RegExp(marcador) }).click();
  await page.getByRole('button', { name: 'Encerrar despesa fixa' }).click();
  const dialogo = page.getByRole('alertdialog');
  await dialogo.getByRole('button', { name: 'Encerrar despesa fixa' }).click();
  await expect(page.getByRole('status').getByText('Despesa fixa encerrada')).toBeVisible({ timeout: 15_000 });
}
