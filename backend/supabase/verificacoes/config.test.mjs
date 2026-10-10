// Confere no config.toml os itens que espelham o painel de produção (G-02, G-16).
// Leitura por linha, sem dependência de parser TOML.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const original = readFileSync(new URL('../config.toml', import.meta.url), 'utf8');

const MARCA = 'espelha o painel';

function semComentario(linha) {
  let emAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') emAspas = !emAspas;
    if (c === '#' && !emAspas) return linha.slice(0, i);
  }
  return linha;
}

// Mapa "secao.chave" -> { valor, comentado }; "comentado" vale para comentário na
// mesma linha ou no bloco de comentários logo acima.
function lerItens(texto) {
  const itens = new Map();
  let secao = '';
  let comentariosAcima = [];
  for (const bruta of texto.split(/\r?\n/)) {
    const linha = bruta.trim();
    if (linha.startsWith('#')) {
      comentariosAcima.push(linha);
      continue;
    }
    const cabecalho = linha.match(/^\[([^\]]+)\]$/);
    if (cabecalho) {
      secao = cabecalho[1].trim();
      comentariosAcima = [];
      continue;
    }
    const par = semComentario(linha).match(/^([A-Za-z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (par) {
      const comentado =
        linha.includes(MARCA) || comentariosAcima.some((c) => c.includes(MARCA));
      itens.set(`${secao}.${par[1]}`, { valor: par[2], comentado });
    }
    comentariosAcima = [];
  }
  return itens;
}

const normalizar = (valor) => valor.replace(/\s+/g, '').replace(/'/g, '"');

const REGRAS = [
  { chave: 'auth.enable_signup', valida: (v) => v === 'false', esperado: 'false' },
  { chave: 'auth.email.enable_signup', valida: (v) => v === 'false', esperado: 'false' },
  { chave: 'auth.minimum_password_length', valida: (v) => Number(v) >= 12, esperado: '>= 12' },
  { chave: 'api.schemas', valida: (v) => normalizar(v) === '["api"]', esperado: '["api"]' },
  { chave: 'auth.jwt_expiry', valida: (v) => v === '3600', esperado: '3600' },
  { chave: 'auth.enable_refresh_token_rotation', valida: (v) => v === 'true', esperado: 'true' },
];

function verificar(texto) {
  const itens = lerItens(texto);
  const problemas = [];
  for (const { chave, valida, esperado } of REGRAS) {
    const item = itens.get(chave);
    if (!item) {
      problemas.push(`${chave} ausente`);
      continue;
    }
    if (!valida(item.valor)) problemas.push(`${chave} = ${item.valor}, esperado ${esperado}`);
    if (!item.comentado) problemas.push(`${chave} sem o comentário "${MARCA}"`);
  }
  return problemas;
}

// Fixtures em memória: altera o valor, remove o comentário ou remove a linha de um item.
function editarItem(texto, chaveCompleta, editar) {
  const ponto = chaveCompleta.lastIndexOf('.');
  const secaoAlvo = chaveCompleta.slice(0, ponto);
  const chaveAlvo = chaveCompleta.slice(ponto + 1);
  const linhas = texto.split(/\r?\n/);
  let secao = '';
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    const cabecalho = linha.match(/^\[([^\]]+)\]$/);
    if (cabecalho) {
      secao = cabecalho[1].trim();
      continue;
    }
    if (secao === secaoAlvo && new RegExp(`^${chaveAlvo}\\s*=`).test(linha)) {
      editar(linhas, i);
      return linhas.join('\n');
    }
  }
  throw new Error(`item ${chaveCompleta} não encontrado no config.toml`);
}

function trocarValor(texto, chave, novo) {
  return editarItem(texto, chave, (linhas, i) => {
    linhas[i] = linhas[i].replace(/=\s*("[^"]*"|\[[^\]]*\]|[^\s#]+)/, `= ${novo}`);
  });
}

function tirarComentario(texto, chave) {
  return editarItem(texto, chave, (linhas, i) => {
    linhas[i] = semComentario(linhas[i]);
    for (let j = i - 1; j >= 0 && linhas[j].trim().startsWith('#'); j--) {
      if (linhas[j].includes(MARCA)) linhas[j] = '';
    }
  });
}

function tirarLinha(texto, chave) {
  return editarItem(texto, chave, (linhas, i) => {
    linhas[i] = '';
  });
}

test('o config.toml versionado cumpre todos os itens', () => {
  assert.deepEqual(verificar(original), []);
});

const valoresErrados = [
  ['auth.enable_signup', 'true'],
  ['auth.email.enable_signup', 'true'],
  ['auth.minimum_password_length', '11'],
  ['auth.minimum_password_length', '6'],
  ['api.schemas', '["api", "public"]'],
  ['api.schemas', '["public", "graphql_public"]'],
  ['api.schemas', '["api", "graphql_public"]'],
  ['auth.jwt_expiry', '7200'],
  ['auth.enable_refresh_token_rotation', 'false'],
];

for (const [chave, valor] of valoresErrados) {
  test(`falha com ${chave} = ${valor}`, () => {
    const alterado = trocarValor(original, chave, valor);
    assert.notEqual(alterado, original);
    assert.ok(verificar(alterado).some((p) => p.startsWith(`${chave} =`)));
  });
}

for (const { chave } of REGRAS) {
  test(`falha com ${chave} sem o comentário "${MARCA}"`, () => {
    const alterado = tirarComentario(original, chave);
    assert.ok(verificar(alterado).includes(`${chave} sem o comentário "${MARCA}"`));
  });

  test(`falha com ${chave} ausente`, () => {
    const alterado = tirarLinha(original, chave);
    assert.ok(verificar(alterado).includes(`${chave} ausente`));
  });
}

test('seeds vêm de supabase/seeds/*.sql', () => {
  const itens = lerItens(original);
  assert.equal(itens.get('db.seed.enabled')?.valor, 'true');
  assert.ok(normalizar(itens.get('db.seed.sql_paths')?.valor ?? '').includes('"./seeds/*.sql"'));
});

test('não traz o ref do projeto de produção', () => {
  assert.ok(!original.includes('xrcxbzrglndetrrhavhc'));
});
