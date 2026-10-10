import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { textoExclusao } from './textoExclusao';

const RESPOSTAS = new URL('../../../../../.md/mockup/respostas/', import.meta.url);
const PAGADOR = JSON.parse(readFileSync(new URL('lancamento-pagador.json', RESPOSTAS), 'utf8')) as {
  descricao: string;
  categoria: { nome: string };
  valor_total_centavos: number;
  num_parcelas: number;
  escopo: 'conjunto' | 'individual';
  tipo: 'despesa' | 'receita';
};

describe('textoExclusao', () => {
  it('conjunta em 3x (lancamento-pagador.json): título e texto exatos do mockup', () => {
    expect(
      textoExclusao({
        descricao: PAGADOR.descricao,
        categoria: PAGADOR.categoria.nome,
        valorTotalCentavos: PAGADOR.valor_total_centavos,
        numParcelas: PAGADOR.num_parcelas,
        escopo: PAGADOR.escopo,
        tipo: PAGADOR.tipo,
      }),
    ).toEqual({
      titulo: 'Excluir esta compra e as 3 parcelas?',
      texto: 'Geladeira nova, R$ 1.950,00 em 3x. A exclusão vale para os dois e não pode ser desfeita.',
    });
  });

  it('sem descrição usa o nome da categoria', () => {
    const { texto } = textoExclusao({
      descricao: null,
      categoria: 'Moradia',
      valorTotalCentavos: 195000,
      numParcelas: 3,
      escopo: 'conjunto',
      tipo: 'despesa',
    });
    expect(texto.startsWith('Moradia, R$ 1.950,00 em 3x.')).toBe(true);
  });
});
