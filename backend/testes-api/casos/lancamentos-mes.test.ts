import { describe, expect, it } from 'vitest';
import exemplo from '../../../.md/mockup/respostas/lancamentos-mes.json';
import vazio from '../../../.md/mockup/respostas/lancamentos-mes-vazio.json';
import { esperarRegistroInvalido } from '../src/esperar';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

interface Item {
  lancamento_id: string;
}
interface LancamentosMes {
  quantidade: number;
  total_filtrado_centavos: number;
  itens: Item[];
}

const mes = '2026-10-01';

describe('api.lancamentos_mes', () => {
  it('A recebe o mês no formato do exemplo (individuais variáveis)', async () => {
    const { data, error } = await (
      await comoA()
    ).rpc('lancamentos_mes', {
      p_mes: mes,
      p_escopo: 'individual',
      p_variavel: true,
    });
    expect(error).toBeNull();
    const resposta = data as LancamentosMes;
    // Outros arquivos de caso deixam lançamentos no banco: o formato é conferido nos itens do seed.
    const idsDoExemplo = new Set(exemplo.itens.map((i) => i.lancamento_id));
    mesmaForma({ ...resposta, itens: resposta.itens.filter((i) => idsDoExemplo.has(i.lancamento_id)) }, exemplo);
    expect(resposta.quantidade).toBe(resposta.itens.length);
    expect(resposta.itens.length).toBeGreaterThan(0);
  });

  it('forma de A pedida por B devolve vazio, sem erro', async () => {
    const { data, error } = await (
      await comoB()
    ).rpc('lancamentos_mes', {
      p_mes: mes,
      p_escopo: 'conjunto',
      p_forma_id: vazio.filtros.forma_id,
    });
    expect(error).toBeNull();
    mesmaForma(data, vazio);
  });

  it('B nunca recebe lançamento individual de A', async () => {
    const { data, error } = await (await comoB()).rpc('lancamentos_mes', { p_mes: mes });
    expect(error).toBeNull();
    const texto = JSON.stringify(data);
    const { data: deA } = await (await comoA()).rpc('lancamentos_mes', { p_mes: mes, p_escopo: 'individual' });
    const idsDeA = (deA as LancamentosMes).itens.map((i) => i.lancamento_id);
    expect(idsDeA.length).toBeGreaterThan(0);
    for (const id of idsDeA) expect(texto).not.toContain(id);
  });

  it('escopo inválido é recusado', async () => {
    const { error } = await (await comoA()).rpc('lancamentos_mes', { p_mes: mes, p_escopo: 'x' });
    expect(error?.message).toBe('valor_invalido');
  });

  it('usuário sem membro não obtém nada', async () => {
    await esperarRegistroInvalido((await comoSemMembro()).rpc('lancamentos_mes', { p_mes: mes }));
  });

  it('anon não executa', async () => {
    const { data, error } = await (await comoAnon()).rpc('lancamentos_mes', { p_mes: mes });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
