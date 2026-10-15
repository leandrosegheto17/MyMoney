import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { beforeAll, describe, expect, it } from 'vitest';

// `import x from '*.json'` alarga literais para string; por isso o teste gera TS a partir
// do texto de cada JSON do mockup e compila `<json> satisfies <Tipo>` com o compilador.

const PACOTE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RESPOSTAS = resolve(PACOTE, '../../.md/mockup/respostas');
const VIRTUAIS = join(PACOTE, 'test', '__respostas__');

type Caso = { json: string; modulo: string; tipo: string };

const r = (json: string, modulo: string, tipo: string): Caso => ({ json, modulo, tipo });

const TABELA: Caso[] = [
  r('contexto.json', 'contexto', 'Contexto'),
  r('contexto-ana.json', 'contexto', 'Contexto'),
  r('dados-lancamento.json', 'dados-lancamento', 'DadosLancamento'),
  r('dados-lancamento-sem-formas.json', 'dados-lancamento', 'DadosLancamento'),
  r('resumo-mes.json', 'resumo-mes', 'ResumoMes'),
  r('resumo-mes-vazio.json', 'resumo-mes', 'ResumoMes'),
  r('lancamentos-mes.json', 'lancamentos-mes', 'LancamentosMes'),
  r('lancamentos-mes-vazio.json', 'lancamentos-mes', 'LancamentosMes'),
  r('lancamento-pagador.json', 'lancamento', 'Lancamento'),
  r('lancamento-outro-membro.json', 'lancamento', 'Lancamento'),
  r('ocorrencias-mes.json', 'ocorrencias-mes', 'OcorrenciasMes'),
  r('ocorrencias-mes-vazio.json', 'ocorrencias-mes', 'OcorrenciasMes'),
  r('orcamento-mes.json', 'orcamento-mes', 'OrcamentoMes'),
  r('orcamento-mes-vazio.json', 'orcamento-mes', 'OrcamentoMes'),
  r('movimentos-meta.json', 'movimentos-meta', 'MovimentosMeta'),
  r('movimentos-meta-vazio.json', 'movimentos-meta', 'MovimentosMeta'),
  r('locais-guardados.json', 'locais-guardados', 'LocaisGuardados'),
  r('lancar-despesa-credito.json', 'lancar-despesa', 'LancarDespesa'),
  r('contas.json', 'contas', 'LinhaContas[]'),
  r('contas-vazio.json', 'contas', 'LinhaContas[]'),
  r('conta-nubank.json', 'contas', 'LinhaContas[]'),
  r('formas-pagamento.json', 'formas-pagamento', 'LinhaFormasPagamento[]'),
  r('formas-vazio.json', 'formas-pagamento', 'LinhaFormasPagamento[]'),
  r('forma-xp.json', 'formas-pagamento', 'LinhaFormasPagamento[]'),
  r('categorias.json', 'categorias', 'LinhaCategorias[]'),
  r('categorias-vazio.json', 'categorias', 'LinhaCategorias[]'),
  r('categoria-mercado.json', 'categorias', 'LinhaCategorias[]'),
  r('despesas-fixas.json', 'despesas-fixas', 'LinhaDespesasFixas[]'),
  r('despesas-fixas-vazio.json', 'despesas-fixas', 'LinhaDespesasFixas[]'),
  r('despesa-fixa.json', 'despesas-fixas', 'LinhaDespesasFixas[]'),
  r('metas.json', 'metas', 'LinhaMetas[]'),
  r('metas-vazio.json', 'metas', 'LinhaMetas[]'),
  r('meta-carro.json', 'metas', 'LinhaMetas[]'),
  r('meta-detalhe.json', 'metas', 'LinhaMetas[]'),
];

const ERROS = ['erro-registro-invalido.json', 'erro-categoria-arquivada.json'];

// Respostas do Auth e do gateway: fora do schema `api`, sem tipo no contrato.
const EXCLUIDOS: Record<string, string> = {
  'auth-usuario.json': 'resposta do Supabase Auth, não do schema api',
  'erro-servico.json': 'erro do gateway (503), não do schema api',
  'ajustar-saldo-simular.json': 'escalar (diferença em centavos) devolvido pela função, sem objeto a tipar',
  'fila-offline.json': 'formato da fila local do cliente (armazenamento do navegador), não resposta da API',
  'fila-offline-vazia.json': 'formato da fila local do cliente (armazenamento do navegador), não resposta da API',
};

const normalizar = (caminho: string) => caminho.replace(/\\/g, '/');
const lerJson = (nome: string) => readFileSync(join(RESPOSTAS, nome), 'utf8');
const nomeVirtual = (id: string) => normalizar(join(VIRTUAIS, `${id.replace(/[^a-z0-9-]/gi, '_')}.ts`));

function fonteDoCaso(caso: Caso, texto = lerJson(caso.json)): string {
  const importado = caso.tipo.replace(/\[\]$/, '');
  return [
    `import type { ${importado} } from '../../src/respostas/${caso.modulo}';`,
    `export const valor = (${texto}) satisfies ${caso.tipo};`,
  ].join('\n');
}

function opcoesDoPacote(): ts.CompilerOptions {
  const arquivo = ts.findConfigFile(PACOTE, ts.sys.fileExists, 'tsconfig.json');
  if (!arquivo) throw new Error('tsconfig.json do pacote não encontrado');
  const lido = ts.readConfigFile(arquivo, ts.sys.readFile);
  const conf = ts.parseJsonConfigFileContent(lido.config, ts.sys, PACOTE);
  return { ...conf.options, noEmit: true };
}

function compilar(fontes: Map<string, string>): Map<string, string[]> {
  const opcoes = opcoesDoPacote();
  const host = ts.createCompilerHost(opcoes);
  const original = { getSourceFile: host.getSourceFile, fileExists: host.fileExists, readFile: host.readFile };
  host.fileExists = (f) => fontes.has(normalizar(f)) || original.fileExists.call(host, f);
  host.readFile = (f) => fontes.get(normalizar(f)) ?? original.readFile.call(host, f);
  host.getSourceFile = (f, versao, ...resto) => {
    const texto = fontes.get(normalizar(f));
    return texto !== undefined
      ? ts.createSourceFile(f, texto, versao)
      : original.getSourceFile.call(host, f, versao, ...resto);
  };
  const programa = ts.createProgram([...fontes.keys()], opcoes, host);
  const erros = new Map<string, string[]>();
  for (const nome of fontes.keys()) {
    const arquivo = programa.getSourceFile(nome);
    const diagnosticos = arquivo ? ts.getPreEmitDiagnostics(programa, arquivo) : [];
    erros.set(
      nome,
      diagnosticos.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
    );
  }
  return erros;
}

const CATEGORIAS_ESCOPO_INVALIDO = 'negativo-escopo-casa';
const LANCAMENTO_PAGAMENTO_NULO = 'negativo-pagamento-nulo';
const LANCAMENTO_RECEITA_FORMA_NULA = 'positivo-receita-forma-nula';
const LANCAMENTO_DESPESA_COM_FORMA = 'positivo-despesa-com-forma';

let resultado: Map<string, string[]>;

beforeAll(() => {
  const fontes = new Map<string, string>();
  for (const caso of TABELA) fontes.set(nomeVirtual(caso.json), fonteDoCaso(caso));
  for (const erro of ERROS) {
    fontes.set(
      nomeVirtual(erro),
      [
        `import type { CodigoErro } from '../../src/erros';`,
        `export const valor = (${lerJson(erro)}) satisfies { message: CodigoErro } & Record<string, unknown>;`,
      ].join('\n'),
    );
  }
  fontes.set(
    nomeVirtual(CATEGORIAS_ESCOPO_INVALIDO),
    fonteDoCaso(
      r('categorias.json', 'categorias', 'LinhaCategorias[]'),
      lerJson('categorias.json').replace(/"escopo":\s*"conjunto"/, '"escopo": "casa"'),
    ),
  );
  fontes.set(
    nomeVirtual(LANCAMENTO_PAGAMENTO_NULO),
    [
      `import type { Lancamento } from '../../src/respostas/lancamento';`,
      `export const valor = { ...(${lerJson('lancamento-outro-membro.json')}), pagamento: null } satisfies Lancamento;`,
    ].join('\n'),
  );
  const pagamentoReceita = `{ forma: null, conta: { id: 'c1', nome: 'Conta' }, data_operacao: '2026-05-10', dia_vencimento_aplicado: null }`;
  fontes.set(
    nomeVirtual(LANCAMENTO_RECEITA_FORMA_NULA),
    [
      `import type { Lancamento } from '../../src/respostas/lancamento';`,
      `export const valor = { ...(${lerJson('lancamento-pagador.json')}), tipo: 'receita', pagamento: ${pagamentoReceita} } satisfies Lancamento;`,
    ].join('\n'),
  );
  fontes.set(
    nomeVirtual(LANCAMENTO_DESPESA_COM_FORMA),
    fonteDoCaso(r('lancamento-pagador.json', 'lancamento', 'Lancamento')),
  );
  resultado = compilar(fontes);
}, 60_000);

describe('respostas do mockup satisfazem os tipos do contrato', () => {
  it.each(TABELA.map((c) => [c.json, c.tipo] as const))('%s satisfies %s', (json) => {
    expect(resultado.get(nomeVirtual(json))).toEqual([]);
  });

  it.each(ERROS)('%s tem message do tipo CodigoErro', (erro) => {
    expect(resultado.get(nomeVirtual(erro))).toEqual([]);
  });
});

describe('pagamento.forma do lançamento', () => {
  it('receita aceita forma null com conta preenchida', () => {
    expect(resultado.get(nomeVirtual(LANCAMENTO_RECEITA_FORMA_NULA))).toEqual([]);
  });

  it('despesa com forma objeto continua compilando', () => {
    expect(resultado.get(nomeVirtual(LANCAMENTO_DESPESA_COM_FORMA))).toEqual([]);
  });
});

describe('o teste detecta forma errada', () => {
  it('escopo "casa" não compila', () => {
    const erros = resultado.get(nomeVirtual(CATEGORIAS_ESCOPO_INVALIDO)) ?? [];
    expect(erros.some((m) => m.includes('casa'))).toBe(true);
  });

  it('pagamento nulo no lançamento não compila (é opcional, nunca null)', () => {
    expect(resultado.get(nomeVirtual(LANCAMENTO_PAGAMENTO_NULO))).not.toEqual([]);
  });
});

describe('tabela JSON → tipo', () => {
  it('todo arquivo de .md/mockup/respostas tem linha na tabela ou exclusão com motivo', () => {
    const cobertos = new Set([...TABELA.map((c) => c.json), ...ERROS, ...Object.keys(EXCLUIDOS)]);
    const arquivos = readdirSync(RESPOSTAS).filter((f) => f.endsWith('.json'));
    expect(arquivos.filter((f) => !cobertos.has(f))).toEqual([]);
  });

  it('a tabela não aponta para arquivo que não existe', () => {
    const arquivos = new Set(readdirSync(RESPOSTAS));
    expect(TABELA.map((c) => c.json).filter((f) => !arquivos.has(f))).toEqual([]);
  });

  it('mapeia os 34 arquivos de recurso', () => {
    expect(TABELA).toHaveLength(34);
  });
});
