// @integracao: Supabase local, dois membros ao mesmo tempo. A cria a meta da casa e aporta com conta; B vê o
// aporte sem a conta (RN-08); a retirada acima do guardado no local é recusada (CA-18.3); a meta atingida
// ganha o selo; a meta individual de A e os locais dela não chegam a B (CA-17.4, SDD §7 item 6, G-05).
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from '../apoio/acessibilidade';
import { abrirSessoes, IDS_FORMAS_E_CONTAS_DE_A, NOMES_FORMAS_E_CONTAS_DE_A, type Sessoes } from './apoio/casal';
import { coletarRespostas, type ColetorRede } from './apoio/coletorRede';
import { emCentavos } from './apoio/leitura';
import { novoMarcador } from './apoio/marcador';

test.describe.configure({ mode: 'serial' });

const marcador = novoMarcador('e2e-meta');
const nomeCasa = `Casa ${marcador}`;
const nomeIndividual = `Minha ${marcador}`;
const localCasa = `Cofre-${marcador}`;
const localPrivado = `Privado-${marcador}`;
const ID_NUBANK = '00000000-0000-4000-8000-000000000201';
const ALVO = 100000;
const APORTE = 40000;

let sessoes: Sessoes;
let coletorB: ColetorRede;
let idCasa = '';
let idIndividual = '';
let saldoAntes = 0;

const dinheiro = (centavos: number) =>
  new RegExp(`R\\$\\s*${(centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }).replace(/\./g, '\\.')}`);

test.beforeAll(async ({ browser }) => {
  sessoes = await abrirSessoes(browser);
  coletorB = coletarRespostas(sessoes.b);
});

test.afterAll(async () => {
  await sessoes.fechar();
});

async function saldoDoNubank(page: Page): Promise<number> {
  await page.goto('/ajustes/contas');
  const linha = page.getByRole('link', { name: /Nubank/ }).first();
  await expect(linha).toBeVisible();
  return emCentavos(/R\$[\s ]*-?[\d.]+,\d{2}/.exec((await linha.textContent()) ?? '')?.[0] ?? '');
}

async function criarMeta(page: Page, nome: string, alvoCentavos: number, escopo: 'casa' | 'minha'): Promise<string> {
  await page.goto(escopo === 'casa' ? '/metas/nova?escopo=casa' : '/metas/nova');
  await page.getByLabel('Nome', { exact: true }).fill(nome);
  await page.getByLabel('Valor-alvo').fill(String(alvoCentavos));
  await page.getByRole('radio', { name: escopo === 'casa' ? 'Da casa' : 'Minha' }).check({ force: true });
  await page.getByRole('button', { name: 'Criar meta' }).click();
  await expect(page.getByRole('status').getByText('Meta salva')).toBeVisible();
  await page.waitForURL(/\/metas\/[0-9a-f-]{36}$/);
  return /\/metas\/([0-9a-f-]{36})$/.exec(page.url())![1];
}

async function abrirFolha(page: Page, id: string, tipo: 'aporte' | 'retirada') {
  await page.goto(`/metas/${id}?movimentar=${tipo}`);
  return page.getByRole('dialog');
}

async function aportar(page: Page, id: string, centavos: number, local: string, conta?: string) {
  const folha = await abrirFolha(page, id, 'aporte');
  await folha.getByLabel('Valor', { exact: true }).fill(String(centavos));
  await folha.getByLabel('Onde está guardado').fill(local);
  if (conta) await folha.getByLabel('Conta de origem (opcional)').selectOption({ label: conta });
  await folha.getByRole('button', { name: 'Confirmar aporte' }).click();
  await expect(page.getByRole('status').getByText('Aporte registrado')).toBeVisible();
  await expect(folha).toBeHidden();
}

test('@integracao A cria a meta da casa e aporta com a conta: o saldo da conta cai', async () => {
  const a = sessoes.a;
  saldoAntes = await saldoDoNubank(a);

  idCasa = await criarMeta(a, nomeCasa, ALVO, 'casa');

  const folha = await abrirFolha(a, idCasa, 'aporte');
  await semViolacoesGraves(a);
  await folha.getByLabel('Valor', { exact: true }).fill(String(APORTE));
  await folha.getByLabel('Onde está guardado').fill(localCasa);
  await folha.getByLabel('Conta de origem (opcional)').selectOption({ label: 'Nubank' });
  await folha.getByRole('button', { name: 'Confirmar aporte' }).click();
  await expect(a.getByRole('status').getByText('Aporte registrado')).toBeVisible();
  await expect(folha).toBeHidden();

  await expect(a.getByText(/Faltam/)).toBeVisible();
  await expect(
    a
      .getByRole('main')
      .getByText(dinheiro(ALVO - APORTE))
      .first(),
  ).toBeVisible();
  await expect(
    a
      .getByRole('list')
      .filter({ hasText: 'Aporte · Leandro' })
      .getByText(new RegExp(`${localCasa}.*da conta Nubank`)),
  ).toBeVisible();

  expect(await saldoDoNubank(a)).toBe(saldoAntes - APORTE);
});

test('@integracao B vê a meta da casa e o aporte de A, sem a conta (RN-08)', async () => {
  const b = sessoes.b;
  await b.goto('/metas');
  await expect(
    b.getByRole('region', { name: 'Da casa' }).getByRole('link', { name: new RegExp(nomeCasa) }),
  ).toBeVisible();

  await b.goto(`/metas/${idCasa}`);
  const linha = b.getByRole('listitem').filter({ hasText: 'Aporte · Leandro' });
  await expect(linha).toContainText(localCasa);
  await expect(linha).toContainText(/\d{2}\/\d{2}/);
  await expect(linha).not.toContainText('da conta');
  await expect(b.getByText('Nubank')).toHaveCount(0);
  await semViolacoesGraves(b);

  // "Caixinha Nubank" é local de guardado da casa e pode chegar a B: só o nome inteiro da conta (entre aspas) conta.
  const nomesDeA = NOMES_FORMAS_E_CONTAS_DE_A.map((nome) => new RegExp(`"${nome}"`));
  const vazamentos = await coletorB.vazamentos([/"conta"\s*:\s*\{/, 'movimento_conta', ID_NUBANK, ...nomesDeA]);
  expect(vazamentos).toEqual([]);
});

test('@integracao retirada acima do guardado no local é recusada e nada é gravado (CA-18.3)', async () => {
  const a = sessoes.a;
  const folha = await abrirFolha(a, idCasa, 'retirada');
  await folha
    .getByRole('radio', { name: new RegExp(localCasa) })
    .locator('xpath=ancestor::label')
    .click();
  await folha.getByLabel('Valor', { exact: true }).fill('50000');
  await folha.getByRole('button', { name: 'Confirmar retirada' }).click();

  await expect(folha.getByText(/A retirada não pode passar disso/)).toBeVisible();
  await expect(folha.getByText(new RegExp(`Em ${localCasa} há`))).toBeVisible();

  await a.goto(`/metas/${idCasa}`);
  const onde = a.getByRole('region', { name: 'Onde está guardado' });
  await expect(onde).toContainText(localCasa);
  await expect(onde).toContainText(dinheiro(APORTE));
  await expect(a.getByRole('listitem').filter({ hasText: 'Retirada' })).toHaveCount(0);
});

test('@integracao meta atingida ganha o selo na lista', async () => {
  const a = sessoes.a;
  await aportar(a, idCasa, ALVO - APORTE, localCasa);

  await expect(a.getByText(/Faltam/)).toBeVisible();
  await expect(a.getByRole('main').getByText(dinheiro(0)).first()).toBeVisible();

  await a.goto('/metas');
  await expect(
    a.getByRole('region', { name: 'Da casa' }).getByRole('link', { name: new RegExp(nomeCasa) }),
  ).toContainText('Atingida');
});

test('@integracao meta individual de A não chega a B: nem lista, nem locais sugeridos, nem URL', async () => {
  const a = sessoes.a;
  const b = sessoes.b;
  idIndividual = await criarMeta(a, nomeIndividual, 50000, 'minha');
  await aportar(a, idIndividual, 10000, localPrivado);

  await b.goto('/metas');
  await expect(
    b.getByRole('region', { name: 'Da casa' }).getByRole('link', { name: new RegExp(nomeCasa) }),
  ).toBeVisible();
  await expect(b.getByRole('link', { name: new RegExp(nomeIndividual) })).toHaveCount(0);
  await expect(b.getByText(nomeIndividual)).toHaveCount(0);

  const folha = await abrirFolha(b, idCasa, 'aporte');
  await expect(folha.getByLabel('Onde está guardado')).toBeVisible();
  await expect(folha.locator(`datalist option[value="${localPrivado}"]`)).toHaveCount(0);
  await expect(folha.getByText(localPrivado)).toHaveCount(0);

  await b.goto(`/metas/${idIndividual}`);
  await expect(b.getByRole('heading', { name: 'Esta meta não existe mais' })).toBeVisible();

  const vazamentos = await coletorB.vazamentos([nomeIndividual, localPrivado, ...IDS_FORMAS_E_CONTAS_DE_A]);
  expect(vazamentos).toEqual([]);
});
