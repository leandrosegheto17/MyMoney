// Leituras e ações da T09 (orçamento) reais: a pessoa navega, lê o texto e salva pela folha de valor.
import { expect, type Page } from '@playwright/test';

export type EscopoOrcamento = 'casa' | 'eu';

export interface LinhaLida {
  nome: string;
  realizado: string;
  orcado: string;
  percentual: number;
  situacao: string;
  categoriaId: string;
}

const ROTULO_LINHA = /^Editar orçamento de (.+): (R\$ [\d.,]+) de (R\$ [\d.,]+), (\d+)%, (.+)$/;

export const moeda = (centavos: number): string =>
  `R$ ${(centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** 'AAAA-MM' do mês `n` meses depois (ou antes, se negativo) de `mes`. */
export function somarMeses(mes: string, n: number): string {
  const d = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5)) - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function mesCorrente(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

/** Nome do mês em minúsculas, sem o ano ("novembro"). */
export const nomeDoMes = (mes: string): string => NOMES_MES[Number(mes.slice(5)) - 1];

export async function abrirOrcamento(page: Page, escopo: EscopoOrcamento, mes?: string): Promise<void> {
  await page.goto(`/orcamento?escopo=${escopo}${mes ? `&mes=${mes}` : ''}`);
  await esperarOrcamento(page, escopo);
}

export async function esperarOrcamento(page: Page, escopo: EscopoOrcamento): Promise<void> {
  await expect(page.getByRole('radio', { name: escopo === 'casa' ? 'Casa' : 'Eu' })).toBeChecked();
  await expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'false');
}

/** Linhas "Por categoria" da T09 aberta, lidas pelo nome acessível do link de edição. */
export async function lerLinhas(page: Page): Promise<LinhaLida[]> {
  const links = await page
    .getByRole('link', { name: /^Editar orçamento de / })
    .evaluateAll((els) => els.map((el) => [el.getAttribute('aria-label') ?? '', el.getAttribute('href') ?? '']));
  return links.map(([rotulo, href]) => {
    const [, nome, realizado, orcado, percentual, situacao] = ROTULO_LINHA.exec(rotulo)!;
    return { nome, realizado, orcado, percentual: Number(percentual), situacao, categoriaId: new URL(href, 'http://x').searchParams.get('editar')! };
  });
}

export async function linhaDe(page: Page, nome: string): Promise<LinhaLida> {
  const linha = (await lerLinhas(page)).find((l) => l.nome === nome);
  if (!linha) throw new Error(`Sem linha de orçamento para ${nome}`);
  return linha;
}

/** Abre a folha de valor da categoria: "Editar" se já tem orçamento no mês, "Definir" se não. Devolve o id da categoria da URL. */
export async function abrirFolhaDeValor(page: Page, nome: string): Promise<string> {
  const comecar = page.getByRole('button', { name: /^Definir (do zero|orçamento)$/ });
  if ((await comecar.count()) > 0) await comecar.click();

  const editar = page.getByRole('link', { name: new RegExp(`^Editar orçamento de ${nome}:`) });
  if ((await editar.count()) > 0) {
    await editar.click();
  } else {
    const definir = page.getByRole('link', { name: `Definir orçamento de ${nome}` });
    if (!(await definir.isVisible())) await page.getByText(/^Sem orçamento \(\d+\)/).click();
    await definir.click();
  }
  await expect(page.getByRole('dialog', { name: `Orçamento de ${nome}` })).toBeVisible();
  return new URL(page.url()).searchParams.get('editar')!;
}

/** Digita o valor e salva; espera o aviso e o fechamento da folha. */
export async function salvarValor(page: Page, centavos: number): Promise<void> {
  await page.getByLabel('Valor orçado').fill(String(centavos));
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('status').getByText('Orçamento salvo')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

export async function definirOrcamento(page: Page, nome: string, centavos: number): Promise<string> {
  const id = await abrirFolhaDeValor(page, nome);
  await salvarValor(page, centavos);
  return id;
}
