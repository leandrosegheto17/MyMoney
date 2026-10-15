import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import exemplo from '../../../.md/mockup/respostas/despesa-fixa.json';
import { esperarRegistroInvalido } from '../src/esperar';
import { apagarFixas } from '../src/limpar-fixas';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

const CONJUNTA = '00000000-0000-4000-8000-000000000401';
const INDIVIDUAL_DE_A = '00000000-0000-4000-8000-000000000412';

describe('api.salvar_despesa_fixa', () => {
  const criadas: string[] = [];
  afterAll(() => apagarFixas(criadas));

  it('A cria a fixa e a lê pela view despesas_fixas, no formato do exemplo', async () => {
    const a = await comoA();
    const id = randomUUID();
    criadas.push(id);
    const criada = await a.rpc('salvar_despesa_fixa', {
      p_id: id,
      p_descricao: 'Aluguel',
      p_categoria_id: CONJUNTA,
      p_valor_previsto_centavos: 120000,
      p_dia_vencimento: 10,
    });
    expect(criada.error).toBeNull();
    expect(criada.data).toBe(id);
    const lida = await a.from('despesas_fixas').select('*').eq('id', id).single();
    expect(lida.error).toBeNull();
    mesmaForma([lida.data], exemplo);
  });

  it('B edita o modelo criado por A', async () => {
    const id = randomUUID();
    criadas.push(id);
    const base = { p_id: id, p_descricao: 'Internet', p_categoria_id: CONJUNTA, p_dia_vencimento: 5 };
    expect(
      (await (await comoA()).rpc('salvar_despesa_fixa', { ...base, p_valor_previsto_centavos: 9000 })).error,
    ).toBeNull();
    const editada = await (await comoB()).rpc('salvar_despesa_fixa', { ...base, p_valor_previsto_centavos: 9900 });
    expect(editada.error).toBeNull();
    const lida = await (await comoA()).from('despesas_fixas').select('*').eq('id', id).single();
    expect(lida.error).toBeNull();
    expect(lida.data).toMatchObject({ id, valor_previsto_centavos: 9900 });
  });

  it('B usando a categoria individual de A recebe registro_invalido', async () => {
    await esperarRegistroInvalido(
      (await comoB()).rpc('salvar_despesa_fixa', {
        p_id: randomUUID(),
        p_descricao: 'Gás',
        p_categoria_id: INDIVIDUAL_DE_A,
        p_valor_previsto_centavos: 5000,
        p_dia_vencimento: 6,
      }),
    );
  });

  it('usuário sem membro não grava', async () => {
    await esperarRegistroInvalido(
      (await comoSemMembro()).rpc('salvar_despesa_fixa', {
        p_id: randomUUID(),
        p_descricao: 'Gás',
        p_categoria_id: CONJUNTA,
        p_valor_previsto_centavos: 5000,
        p_dia_vencimento: 6,
      }),
    );
  });

  it('anon não executa', async () => {
    const { data, error } = await (
      await comoAnon()
    ).rpc('salvar_despesa_fixa', {
      p_id: randomUUID(),
      p_descricao: 'Gás',
      p_categoria_id: CONJUNTA,
      p_valor_previsto_centavos: 5000,
      p_dia_vencimento: 6,
    });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
