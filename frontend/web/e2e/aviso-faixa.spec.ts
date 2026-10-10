import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const mockup = join(process.cwd(), '../../.md/mockup');
const tokens = readFileSync(join(mockup, 'tokens.css'), 'utf8');
const base = readFileSync(join(mockup, 'base.css'), 'utf8');

const pagina = `<!doctype html><html lang="pt-BR"><head><title>Prova</title></head><body><main>
<h1>Prova</h1>
<div class="faixa faixa-aviso" role="status"><span class="texto-faixa">Sem conexão. Os lançamentos ficam guardados no aparelho.</span></div>
<div class="faixa faixa-aviso" role="status"><span class="texto-faixa">1 lançamento aguardando envio.</span><a href="#v">Ver</a></div>
<div class="faixa" role="region" aria-label="Instalar o app"><span class="texto-faixa">Instale o MyMoney para lançar mais rápido.</span><button class="botao botao-principal" type="button">Instalar</button></div>
<div class="faixa" role="status"><span class="texto-faixa">Mostrando dados de 14:32</span></div>
<div role="status" aria-live="polite"><div class="aviso" style="position:static"><span>Lançamento salvo</span></div><div class="aviso" style="position:static"><span>Guardado no aparelho</span></div></div>
<div role="alert" aria-live="assertive"><div class="aviso" style="position:static"><span>Não foi possível salvar</span></div></div>
</main></body></html>`;

test('faixas e avisos sem violações graves de acessibilidade', async ({ page }) => {
  await page.setContent(pagina);
  await page.addStyleTag({ content: `${tokens}\n${base}` });
  await semViolacoesGraves(page);
});
