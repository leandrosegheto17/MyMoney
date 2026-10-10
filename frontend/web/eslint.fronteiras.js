// Fronteiras de camada do @mymoney/web (SDD §2, "Camadas dentro de frontend/web/src").
// A matriz mora aqui, uma vez: a config raiz e o teste das regras usam a mesma fábrica.
import path from 'node:path';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';

const CAMADAS = ['componentes', 'dados', 'formatacao', 'ganchos', 'paginas', 'configuracao', 'pwa', 'rotulos'];

// Quem cada camada NÃO pode importar (o complemento do "pode importar" do SDD).
const PODE_IMPORTAR = {
  paginas: ['componentes', 'ganchos', 'formatacao', 'rotulos'],
  componentes: ['formatacao', 'rotulos'],
  ganchos: ['dados'],
  dados: ['configuracao'],
  formatacao: [],
  rotulos: [],
  pwa: [],
  configuracao: [],
};

const PACOTES_CONTRATO = ['@mymoney/*', '!@mymoney/contrato', '!@mymoney/contrato/**'];
const PACOTES_SO_DADOS = ['@supabase/supabase-js', 'idb-keyval'];
const MSG_ESCRITA = 'escrita só por rpc (ADR-003)';
const MSG_BUILDER = 'não guarde o resultado de .from(...) numa variável: escrita só por rpc (ADR-003)';

// Fonte do regex do selector: o `/` do nome do pacote precisa de escape dentro do literal.
const NOMES_SO_DADOS = PACOTES_SO_DADOS.map((n) => n.replaceAll('/', '\\/')).join('|');
const MSG_IMPORT_DINAMICO = 'import()/require() desses pacotes só em dados/ (SDD §2)';

// Escrita encadeada direto em .from(...), ou o construtor da tabela guardado numa variável
// (`Array.from` fica de fora). Escrita em construtor guardado depois de `.select()` etc. não é detectável por selector.
const SELECTORES_ESCRITA = [
  {
    selector:
      "CallExpression[callee.property.name=/^(insert|update|upsert|delete)$/][callee.object.callee.property.name='from']",
    message: MSG_ESCRITA,
  },
  {
    selector:
      ":matches(VariableDeclarator, AssignmentExpression) > CallExpression[callee.property.name='from'][callee.object.name!='Array']",
    message: MSG_BUILDER,
  },
];

const SELECTORES_IMPORT_DINAMICO = [
  {
    selector: `ImportExpression[source.value=/^(${NOMES_SO_DADOS})(\\/|$)/]`,
    message: MSG_IMPORT_DINAMICO,
  },
  {
    selector: `CallExpression[callee.name='require'][arguments.0.value=/^(${NOMES_SO_DADOS})(\\/|$)/]`,
    message: MSG_IMPORT_DINAMICO,
  },
];

// Com `base` (a pasta da config), o glob é exato; sem ela, casa qualquer pasta com o nome de `raizSrc`.
function globRelativo(base, raizSrc, sufixo) {
  const rel = base ? path.relative(base, raizSrc).split(path.sep).join('/') : `**/${path.basename(raizSrc)}`;
  return `${rel}/${sufixo}`;
}

function zonasDeCamadas(raizSrc) {
  const em = (...partes) => path.join(raizSrc, ...partes);
  const zonas = [];
  for (const camada of CAMADAS) {
    const permitidas = new Set([camada, ...PODE_IMPORTAR[camada]]);
    for (const outra of CAMADAS) {
      if (permitidas.has(outra)) continue;
      zonas.push({
        target: em(camada),
        from: em(outra),
        message: `${camada}/ não importa ${outra}/ (SDD §2)`,
      });
    }
  }
  zonas.push({
    target: em('componentes', 'base'),
    from: em('componentes'),
    except: ['./base'],
    message: 'componentes/base/ não importa o resto de componentes/ (SDD §2)',
  });
  zonas.push({
    target: em('ganchos'),
    from: em('dados', 'cliente.ts'),
    message: 'o cliente supabase é interno a dados/ (SDD §2)',
  });
  return zonas;
}

/** Blocos de flat config com as regras de fronteira para a árvore `raizSrc`. */
export function regrasFronteira(raizSrc, base) {
  const todos = globRelativo(base, raizSrc, '**/*.{ts,tsx}');
  const dados = globRelativo(base, raizSrc, 'dados/**/*.{ts,tsx}');
  const restricaoPacotes = (nomes) => ({
    paths: nomes.map((name) => ({
      name,
      message: `${name} só em dados/ (SDD §2)`,
    })),
    patterns: [
      {
        group: PACOTES_CONTRATO,
        message: 'só @mymoney/contrato pode ser importado pelo web (SDD §2)',
      },
    ],
  });

  return [
    {
      files: [todos],
      plugins: { 'import-x': importX },
      settings: { 'import-x/resolver-next': [createTypeScriptImportResolver()] },
      rules: {
        'import-x/no-restricted-paths': ['error', { zones: zonasDeCamadas(raizSrc) }],
        'no-restricted-syntax': ['error', ...SELECTORES_ESCRITA],
      },
    },
    // Um bloco por glob: em flat config, outro bloco com a mesma regra substitui o anterior.
    {
      files: [todos],
      ignores: [dados],
      rules: {
        'no-restricted-imports': ['error', restricaoPacotes(PACOTES_SO_DADOS)],
        'no-restricted-syntax': ['error', ...SELECTORES_ESCRITA, ...SELECTORES_IMPORT_DINAMICO],
      },
    },
    { files: [dados], rules: { 'no-restricted-imports': ['error', restricaoPacotes([])] } },
  ];
}
