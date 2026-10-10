import { describe, expect, it } from 'vitest';
import { compararComCatalogo, lerTipos, montarCatalogo } from './aderencia-tipos';

const FONTE = `
export type Database = {
  api: {
    Views: {
      contas: {
        Row: {
          id: string;
          nome: string;
          saldo: number | null;
        };
        Insert: Partial<Record<string, unknown>>;
        Update: Partial<Record<string, unknown>>;
        Relationships: [];
      };
    };
    Functions: {
      arquivar: { Args: { p_id: string }; Returns: undefined };
      listar: { Args: never; Returns: unknown };
      salvar: {
        Args: { p_id: string; p_nome: string; p_extra?: boolean | null };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
  };
};`;

const catalogo = () =>
  montarCatalogo(
    [{ nome: 'contas', colunas: ['id', 'nome', 'saldo'] }],
    [
      { nome: 'arquivar', retorna_vazio: true, args: ['p_id'], padroes: 0 },
      { nome: 'listar', retorna_vazio: false, args: [], padroes: 0 },
      { nome: 'salvar', retorna_vazio: false, args: ['p_id', 'p_nome', 'p_extra'], padroes: 1 },
    ],
  );

describe('aderência de tipos-api.ts ao catálogo de api', () => {
  it('lê views, argumentos, opcionais e retorno vazio', () => {
    const tipos = lerTipos(FONTE);
    expect(tipos.views.get('contas')).toEqual(['id', 'nome', 'saldo']);
    expect(tipos.funcoes.get('salvar')?.args).toEqual(
      new Map([
        ['p_id', false],
        ['p_nome', false],
        ['p_extra', true],
      ]),
    );
    expect(tipos.funcoes.get('arquivar')?.retornaVazio).toBe(true);
    expect(tipos.funcoes.get('listar')?.args.size).toBe(0);
  });

  it('não aponta divergência quando confere', () => {
    expect(compararComCatalogo(lerTipos(FONTE), catalogo())).toEqual([]);
  });

  it.each([
    ['coluna renomeada', FONTE.replace('saldo: number', 'saldo_total: number'), /colunas só/],
    ['argumento renomeado', FONTE.replace('p_nome: string', 'p_titulo: string'), /argumentos só/],
    ['argumento passa a ser opcional', FONTE.replace('p_nome: string', 'p_nome?: string'), /não tem default/],
    ['argumento perde o opcional', FONTE.replace('p_extra?:', 'p_extra:'), /tem default/],
    ['retorno trocado', FONTE.replace('Returns: undefined', 'Returns: unknown'), /retorna void/],
    ['função removida do tipo', FONTE.replace(/ {6}listar:.*\n/, ''), /não está em tipos-api/],
    ['view removida do tipo', FONTE.replace('contas: {', 'outras: {'), /não existe no banco/],
  ])('falha com %s', (_caso, fonte, padrao) => {
    const erros = compararComCatalogo(lerTipos(fonte), catalogo());
    expect(erros.join('\n')).toMatch(padrao);
  });

  it('falha com função do tipo que não existe no banco e com sobrecarga', () => {
    const sem = montarCatalogo(
      [{ nome: 'contas', colunas: ['id', 'nome', 'saldo'] }],
      [{ nome: 'arquivar', retorna_vazio: true, args: ['p_id'], padroes: 0 }],
    );
    expect(compararComCatalogo(lerTipos(FONTE), sem).join('\n')).toMatch(/salvar está em tipos-api.ts e não existe/);
    const dupla = montarCatalogo(
      [],
      [
        { nome: 'arquivar', retorna_vazio: true, args: ['p_id'], padroes: 0 },
        { nome: 'arquivar', retorna_vazio: true, args: [], padroes: 0 },
      ],
    );
    expect(compararComCatalogo(lerTipos(FONTE), dupla).join('\n')).toMatch(/2 sobrecargas/);
  });
});
