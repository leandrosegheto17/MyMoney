// Compara o tipo escrito à mão (tipos-api.ts) com o catálogo do schema `api` de um banco local.

export interface FuncaoLida {
  /** Nome do argumento -> true quando opcional (`?:`). */
  args: Map<string, boolean>;
  retornaVazio: boolean;
}

export interface TiposLidos {
  views: Map<string, string[]>;
  funcoes: Map<string, FuncaoLida>;
}

export interface FuncaoCatalogo {
  nome: string;
  /** Argumentos de entrada, na ordem; `comPadrao` = tem valor default. */
  args: { nome: string; comPadrao: boolean }[];
  retornaVazio: boolean;
}

export interface CatalogoApi {
  views: Map<string, string[]>;
  funcoes: FuncaoCatalogo[];
}

function secao(fonte: string, inicio: string, fim: string): string {
  const de = fonte.indexOf(inicio);
  const ate = fonte.indexOf(fim, de + inicio.length);
  if (de < 0 || ate < 0) throw new Error(`tipos-api.ts sem a seção "${inicio}" ... "${fim}".`);
  return fonte.slice(de + inicio.length, ate);
}

const nomesDe = (corpo: string) =>
  [...corpo.matchAll(/(\w+)(\?)?:/g)].map((m) => ({ nome: m[1] ?? '', opcional: !!m[2] }));

/** Lê views (colunas de Row) e funções (Args e Returns) do formato `supabase gen types` de tipos-api.ts. */
export function lerTipos(fonte: string): TiposLidos {
  const views = new Map<string, string[]>();
  for (const m of secao(fonte, 'Views: {', 'Functions: {').matchAll(/^ {6}(\w+): \{\s*Row: \{([^}]*)\}/gm)) {
    views.set(
      m[1] ?? '',
      nomesDe(m[2] ?? '').map((c) => c.nome),
    );
  }
  const funcoes = new Map<string, FuncaoLida>();
  for (const m of secao(fonte, 'Functions: {', 'Enums:').matchAll(
    /^ {6}(\w+): \{\s*Args: (never|\{([^}]*)\});\s*Returns: ([^;}]+)/gm,
  )) {
    const args = new Map(nomesDe(m[3] ?? '').map((a) => [a.nome, a.opcional] as const));
    funcoes.set(m[1] ?? '', { args, retornaVazio: (m[4] ?? '').trim() === 'undefined' });
  }
  return { views, funcoes };
}

/** Lista as divergências; vazia quando o tipo confere com o catálogo. */
export function compararComCatalogo(tipos: TiposLidos, catalogo: CatalogoApi): string[] {
  const erros: string[] = [];

  for (const [nome, colunas] of catalogo.views) {
    const lidas = tipos.views.get(nome);
    if (!lidas) {
      erros.push(`view api.${nome} existe no banco e não está em tipos-api.ts`);
      continue;
    }
    const faltam = colunas.filter((c) => !lidas.includes(c));
    const sobram = lidas.filter((c) => !colunas.includes(c));
    if (faltam.length) erros.push(`view api.${nome}: colunas só no banco: ${faltam.join(', ')}`);
    if (sobram.length) erros.push(`view api.${nome}: colunas só em tipos-api.ts: ${sobram.join(', ')}`);
  }
  for (const nome of tipos.views.keys()) {
    if (!catalogo.views.has(nome)) erros.push(`view api.${nome} está em tipos-api.ts e não existe no banco`);
  }

  const porNome = new Map<string, FuncaoCatalogo[]>();
  for (const f of catalogo.funcoes) porNome.set(f.nome, [...(porNome.get(f.nome) ?? []), f]);
  for (const [nome, sobrecargas] of porNome) {
    if (sobrecargas.length > 1) {
      erros.push(`função api.${nome} tem ${sobrecargas.length} sobrecargas; o tipo comporta uma só`);
      continue;
    }
    const real = sobrecargas[0];
    if (!real) continue;
    const lida = tipos.funcoes.get(nome);
    if (!lida) {
      erros.push(`função api.${nome} existe no banco e não está em tipos-api.ts`);
      continue;
    }
    const reais = real.args.map((a) => a.nome);
    const faltam = reais.filter((a) => !lida.args.has(a));
    const sobram = [...lida.args.keys()].filter((a) => !reais.includes(a));
    if (faltam.length) erros.push(`função api.${nome}: argumentos só no banco: ${faltam.join(', ')}`);
    if (sobram.length) erros.push(`função api.${nome}: argumentos só em tipos-api.ts: ${sobram.join(', ')}`);
    for (const a of real.args) {
      const opcional = lida.args.get(a.nome);
      if (opcional !== undefined && opcional !== a.comPadrao) {
        erros.push(
          `função api.${nome}: argumento ${a.nome} ${a.comPadrao ? 'tem default e o tipo o exige' : 'não tem default e o tipo o torna opcional'}`,
        );
      }
    }
    if (lida.retornaVazio !== real.retornaVazio) {
      erros.push(
        `função api.${nome}: ${real.retornaVazio ? 'retorna void e o tipo não' : 'não retorna void e o tipo diz undefined'}`,
      );
    }
  }
  for (const nome of tipos.funcoes.keys()) {
    if (!porNome.has(nome)) erros.push(`função api.${nome} está em tipos-api.ts e não existe no banco`);
  }
  return erros;
}

export const CONSULTA_VIEWS = `
  select c.relname as nome, array_agg(a.attname::text order by a.attnum) as colunas
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
   where n.nspname = 'api' and c.relkind in ('v', 'm')
   group by c.relname`;

export const CONSULTA_FUNCOES = `
  select p.proname::text as nome,
         p.prorettype = 'void'::regtype as retorna_vazio,
         coalesce((
           select array_agg(x.nome order by x.pos)
             from unnest(p.proargnames, p.proargmodes) with ordinality as x(nome, modo, pos)
            where coalesce(x.modo, 'i') in ('i', 'b', 'v')
         ), array[]::text[]) as args,
         p.pronargdefaults as padroes
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'api' and p.prokind = 'f'`;

export interface LinhaView {
  nome: string;
  colunas: string[];
}
export interface LinhaFuncao {
  nome: string;
  retorna_vazio: boolean;
  args: string[];
  padroes: number;
}

/** Converte as linhas das consultas acima: os defaults são sempre os últimos argumentos de entrada. */
export function montarCatalogo(views: LinhaView[], funcoes: LinhaFuncao[]): CatalogoApi {
  return {
    views: new Map(views.map((v) => [v.nome, v.colunas])),
    funcoes: funcoes.map((f) => ({
      nome: f.nome,
      retornaVazio: f.retorna_vazio,
      args: f.args.map((nome, i) => ({ nome, comPadrao: i >= f.args.length - f.padroes })),
    })),
  };
}
