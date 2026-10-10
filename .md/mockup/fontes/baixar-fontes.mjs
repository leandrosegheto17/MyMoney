#!/usr/bin/env node
// Baixa os arquivos .woff2 da IBM Plex Sans (400, 500, 600, 700) e da IBM Plex Mono
// (500, 600), subconjunto "latin" (cobre pt-BR, "R$", "·" e "−"), do Google Fonts, e grava
// nesta pasta com os nomes que o tokens.css espera. Licença: OFL 1.1 (LICENSE-OFL.txt).
//
// Uso (Node 18+, sem dependências):
//   node .md/mockup/fontes/baixar-fontes.mjs
//
// Rodar uma vez. Os .woff2 gerados entram no repositório junto com o mockup e são copiados
// sem alteração para o frontend (frontend/web/public/fontes/ ou ao lado do tokens.css).

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pasta = dirname(fileURLToPath(import.meta.url));
const CSS_URL =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap";
// User-Agent moderno: faz o Google Fonts responder com woff2.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const esperados = {
  "IBM Plex Sans|400": "ibm-plex-sans-400.woff2",
  "IBM Plex Sans|500": "ibm-plex-sans-500.woff2",
  "IBM Plex Sans|600": "ibm-plex-sans-600.woff2",
  "IBM Plex Sans|700": "ibm-plex-sans-700.woff2",
  "IBM Plex Mono|500": "ibm-plex-mono-500.woff2",
  "IBM Plex Mono|600": "ibm-plex-mono-600.woff2",
};

const css = await (await fetch(CSS_URL, { headers: { "User-Agent": UA } })).text();
// Blocos no formato: /* latin */ @font-face { font-family: 'IBM Plex Sans'; ... font-weight: 400; ... src: url(...) format('woff2'); ... }
const blocos = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*{([^}]*)}/g)];
let gravados = 0;
for (const [, subconjunto, corpo] of blocos) {
  if (subconjunto !== "latin") continue;
  const familia = corpo.match(/font-family:\s*'([^']+)'/)?.[1];
  const peso = corpo.match(/font-weight:\s*(\d+)/)?.[1];
  const url = corpo.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
  const nome = esperados[`${familia}|${peso}`];
  if (!nome || !url) continue;
  const binario = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(join(pasta, nome), binario);
  console.log(`ok  ${nome}  (${binario.length} bytes)`);
  gravados++;
}
const faltando = Object.values(esperados).length - gravados;
if (faltando > 0) {
  console.error(`faltaram ${faltando} arquivo(s): confira a resposta do Google Fonts.`);
  process.exit(1);
}
