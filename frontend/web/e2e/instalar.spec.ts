// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/instalar.spec.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const RESPOSTAS = join(process.cwd(), '..', '..', '.md', 'mockup', 'respostas');
const ler = (arquivo: string) => readFileSync(join(RESPOSTAS, arquivo), 'utf8');

const UA_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const UA_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const CELULAR = { width: 390, height: 844 };
const PC = { width: 1440, height: 900 };

declare global {
  interface Window {
    __promptChamadas: number;
  }
}

async function abrir(page: Page, viewport = CELULAR) {
  await page.route('**/rest/v1/rpc/contexto', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: ler('contexto.json') }),
  );
  await page.route('**/rest/v1/rpc/resumo_mes*', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: ler('resumo-mes.json') }),
  );
  await page.route('**/rest/v1/rpc/dados_lancamento*', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: ler('dados-lancamento.json') }),
  );
  await page.setViewportSize(viewport);
  await page.goto('/?mes=2026-10');
}

/** Dispara um `beforeinstallprompt` falso depois que o app subiu, como o Chromium faz. */
async function comPromptFalso(page: Page) {
  await page.addInitScript(() => {
    window.__promptChamadas = 0;
    window.addEventListener('load', () => {
      setTimeout(() => {
        const evento = new Event('beforeinstallprompt', { cancelable: true }) as Event & Record<string, unknown>;
        evento.prompt = () => {
          window.__promptChamadas += 1;
          return Promise.resolve();
        };
        evento.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
        window.dispatchEvent(evento);
      }, 100);
    });
  });
}

const faixa = (page: Page) => page.getByRole('region', { name: 'Instalar o app' });

test.describe('Android', () => {
  test.use({ userAgent: UA_ANDROID, hasTouch: true });

  test('faixa na T02, "Instalar" chama o prompt e appinstalled a retira', async ({ page }) => {
    await comPromptFalso(page);
    await abrir(page);
    await expect(faixa(page)).toBeVisible();
    await expect(faixa(page)).toContainText('Instale o MyMoney para lançar mais rápido.');
    await semViolacoesGraves(page);

    // O prompt é guardado depois do load.
    await page.waitForTimeout(400);
    await faixa(page).getByRole('button', { name: 'Instalar' }).click();
    await expect.poll(() => page.evaluate(() => window.__promptChamadas)).toBe(1);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    await expect(faixa(page)).toHaveCount(0);
  });

  test('Dispensar some a faixa e a escolha é lembrada ao recarregar', async ({ page }) => {
    await abrir(page);
    await faixa(page).getByRole('button', { name: 'Dispensar instalação' }).click();
    await expect(faixa(page)).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(faixa(page)).toHaveCount(0);
  });

  test('sem prompt, "Instalar" abre a folha com os passos manuais', async ({ page }) => {
    await abrir(page);
    await faixa(page).getByRole('button', { name: 'Instalar' }).click();
    const folha = page.getByRole('dialog', { name: 'Instalar no Android' });
    await expect(folha).toBeVisible();
    await expect(folha.getByRole('listitem')).toHaveCount(3);
    await semViolacoesGraves(page);
  });

  test('modo instalado (standalone): sem faixa', async ({ page }) => {
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = (consulta: string) =>
        consulta.includes('display-mode: standalone')
          ? ({ ...original(consulta), matches: true } as MediaQueryList)
          : original(consulta);
    });
    await abrir(page);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(faixa(page)).toHaveCount(0);
  });
});

test.describe('iPhone', () => {
  test.use({ userAgent: UA_IPHONE, hasTouch: true });

  test('"Instalar" abre a folha com 3 passos; Esc fecha e o foco volta', async ({ page }) => {
    await abrir(page);
    const instalar = faixa(page).getByRole('button', { name: 'Instalar' });
    await instalar.click();
    const folha = page.getByRole('dialog', { name: 'Instalar no iPhone' });
    await expect(folha).toBeVisible();
    await expect(folha.getByRole('listitem')).toHaveCount(3);
    await expect(folha.getByRole('img', { name: '(ícone de quadrado com seta para cima)' })).toBeVisible();
    await expect(folha.getByRole('img', { name: '(ícone de quadrado com sinal de mais)' })).toBeVisible();
    await semViolacoesGraves(page);

    await page.keyboard.press('Escape');
    await expect(folha).toHaveCount(0);
    await expect(instalar).toBeFocused();
    await expect(faixa(page)).toBeVisible();
  });
});

test('navegador de PC: sem faixa', async ({ page }) => {
  await abrir(page, PC);
  await expect(page.getByRole('main')).toBeVisible();
  await expect(faixa(page)).toHaveCount(0);
});
