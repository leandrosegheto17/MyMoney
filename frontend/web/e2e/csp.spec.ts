// Serve o dist/ com os cabeçalhos do vercel.json e falha se a CSP de produção for violada.
// Requer `pnpm build` antes.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { expect, test } from '@playwright/test';

const DIST = join(process.cwd(), 'dist');
const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};
const PORTA = Number(process.env.PORTA_CSP ?? 4179);

const cabecalhos: Record<string, string> = Object.fromEntries(
  (
    JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
      headers: { headers: { key: string; value: string }[] }[];
    }
  ).headers[0].headers.map((h) => [h.key, h.value]),
);

let servidor: Server;

test.beforeAll(async () => {
  servidor = createServer((req, res) => {
    const caminho = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^([/\\])+/, '');
    let arquivo = join(DIST, caminho);
    if (!arquivo.startsWith(DIST) || !existsSync(arquivo) || !statSync(arquivo).isFile()) {
      arquivo = join(DIST, 'index.html');
    }
    res.writeHead(200, { ...cabecalhos, 'Content-Type': TIPOS[extname(arquivo)] ?? 'application/octet-stream' });
    res.end(readFileSync(arquivo));
  });
  await new Promise<void>((ok) => servidor.listen(PORTA, '127.0.0.1', ok));
});

test.afterAll(() => {
  servidor.close();
});

test('a CSP do vercel.json não proíbe nada que o app carrega nem aplica', async ({ page }) => {
  expect(cabecalhos['Content-Security-Policy']).not.toMatch(/unsafe-(inline|eval)/);
  await page.addInitScript(() => {
    (window as unknown as { __violacoes: string[] }).__violacoes = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __violacoes: string[] }).__violacoes.push(
        `${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`,
      );
    });
  });
  const consoleCsp: string[] = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) consoleCsp.push(m.text());
  });

  const violacoes: string[] = [];
  for (const rota of ['/', '/entrar', '/lancamentos', '/ajustes']) {
    await page.goto(`http://127.0.0.1:${PORTA}${rota}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#raiz')).not.toBeEmpty();
    violacoes.push(...(await page.evaluate(() => (window as unknown as { __violacoes: string[] }).__violacoes)));
  }

  expect(violacoes).toEqual([]);
  expect(consoleCsp).toEqual([]);
});
