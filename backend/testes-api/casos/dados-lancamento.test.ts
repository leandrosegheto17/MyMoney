import { describe, expect, it } from 'vitest';
import exemplo from '../../../.md/mockup/respostas/dados-lancamento.json';
import { esperarRegistroInvalido } from '../src/esperar';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

interface Item {
  id: string;
}
interface DadosLancamento {
  categorias_despesa: Item[];
  categorias_receita: Item[];
  formas: Item[];
  forma_padrao_id: string | null;
  contas: Item[];
  conta_receita_padrao_id: string | null;
}

// Ids do seed: Leandro (A) ...0301-0303 formas, ...0201-0202 contas, ...0411-0415 e ...0421-0423 individuais;
// Ana (B) ...0311 forma, ...0211 conta, ...0431-0435 e ...0441-0443 individuais.
const idsDeA = [
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000302',
  '00000000-0000-4000-8000-000000000303',
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000202',
  ...[411, 412, 413, 414, 415, 421, 422, 423].map((n) => `00000000-0000-4000-8000-000000000${n}`),
];

describe('api.dados_lancamento', () => {
  it('A recebe os dados no formato do exemplo, com padrões do próprio membro', async () => {
    const { data, error } = await (await comoA()).rpc('dados_lancamento');
    expect(error).toBeNull();
    mesmaForma(data, exemplo);
    const dados = data as DadosLancamento;
    expect(dados.forma_padrao_id).toBe(exemplo.forma_padrao_id);
    expect(dados.conta_receita_padrao_id).toBe(exemplo.conta_receita_padrao_id);
    expect(dados.formas.map((f) => f.id).sort()).toEqual(exemplo.formas.map((f) => f.id).sort());
    expect(dados.contas.map((c) => c.id).sort()).toEqual(exemplo.contas.map((c) => c.id).sort());
  });

  it('B não recebe forma, conta nem categoria individual de A', async () => {
    const { data, error } = await (await comoB()).rpc('dados_lancamento');
    expect(error).toBeNull();
    const texto = JSON.stringify(data);
    for (const id of idsDeA) expect(texto).not.toContain(id);
    const dados = data as DadosLancamento;
    expect(dados.forma_padrao_id).not.toBeNull();
    expect(dados.formas.length).toBeGreaterThan(0);
  });

  it('usuário sem membro não obtém nada', async () => {
    await esperarRegistroInvalido((await comoSemMembro()).rpc('dados_lancamento'));
  });

  it('anon não executa', async () => {
    const { data, error } = await (await comoAnon()).rpc('dados_lancamento');
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
