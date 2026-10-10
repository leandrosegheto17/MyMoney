import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import exemplo from '../../../.md/mockup/respostas/lancar-despesa-credito.json';
import { esperarRegistroInvalido } from '../src/esperar';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

const SALARIO_DE_A = '00000000-0000-4000-8000-000000000421';
const NUBANK_DE_A = '00000000-0000-4000-8000-000000000201';
const CONTA_DE_B = '00000000-0000-4000-8000-000000000211';
const MERCADO_CONJUNTA = '00000000-0000-4000-8000-000000000401';

describe('api.lancar_receita', () => {
  it('A lança o salário e a resposta tem a forma da de lançamento', async () => {
    const id = randomUUID();
    const { data, error } = await (await comoA()).rpc('lancar_receita', {
      p_id: id,
      p_valor_centavos: 750000,
      p_categoria_id: SALARIO_DE_A,
      p_conta_id: NUBANK_DE_A,
      p_data: '2026-10-05',
    });
    expect(error).toBeNull();
    mesmaForma(data, exemplo);
    expect(data).toEqual({
      id,
      escopo: 'individual',
      categoria: 'Salário',
      valor_total_centavos: 750000,
      num_parcelas: 1,
      primeira_parcela_data: '2026-10-05',
      ja_existia: false,
    });
  });

  it('reenvio do mesmo id devolve o mesmo resultado com ja_existia', async () => {
    const a = await comoA();
    const args = {
      p_id: randomUUID(),
      p_valor_centavos: 10000,
      p_categoria_id: SALARIO_DE_A,
      p_conta_id: NUBANK_DE_A,
      p_data: '2026-10-06',
    };
    const primeira = await a.rpc('lancar_receita', args);
    const segunda = await a.rpc('lancar_receita', args);
    expect(primeira.error).toBeNull();
    expect(segunda.error).toBeNull();
    expect(segunda.data).toEqual({ ...(primeira.data as object), ja_existia: true });
  });

  it('B não usa conta, categoria nem id de receita de A', async () => {
    const idDeA = randomUUID();
    expect(
      (await (await comoA()).rpc('lancar_receita', {
        p_id: idDeA, p_valor_centavos: 2000, p_categoria_id: SALARIO_DE_A, p_conta_id: NUBANK_DE_A,
      })).error,
    ).toBeNull();

    const b = await comoB();
    await esperarRegistroInvalido(
      b.rpc('lancar_receita', { p_id: randomUUID(), p_valor_centavos: 1000, p_categoria_id: SALARIO_DE_A, p_conta_id: CONTA_DE_B }),
    );
    await esperarRegistroInvalido(
      b.rpc('lancar_receita', { p_id: randomUUID(), p_valor_centavos: 1000, p_categoria_id: SALARIO_DE_A, p_conta_id: NUBANK_DE_A }),
    );
    await esperarRegistroInvalido(
      b.rpc('lancar_receita', { p_id: idDeA, p_valor_centavos: 1000, p_categoria_id: SALARIO_DE_A, p_conta_id: CONTA_DE_B }),
    );
  });

  it('categoria de despesa é recusada com registro_invalido', async () => {
    await esperarRegistroInvalido(
      (await comoA()).rpc('lancar_receita', {
        p_id: randomUUID(), p_valor_centavos: 1000, p_categoria_id: MERCADO_CONJUNTA, p_conta_id: NUBANK_DE_A,
      }),
    );
  });

  it('usuário sem membro recebe registro_invalido', async () => {
    await esperarRegistroInvalido(
      (await comoSemMembro()).rpc('lancar_receita', {
        p_id: randomUUID(), p_valor_centavos: 1000, p_categoria_id: SALARIO_DE_A, p_conta_id: NUBANK_DE_A,
      }),
    );
  });

  it('valor inválido é recusado com valor_invalido', async () => {
    const r = await (await comoA()).rpc('lancar_receita', {
      p_id: randomUUID(), p_valor_centavos: 0, p_categoria_id: SALARIO_DE_A, p_conta_id: NUBANK_DE_A,
    });
    expect(r.error?.message).toBe('valor_invalido');
  });

  it('anon não executa', async () => {
    const r = await (await comoAnon()).rpc('lancar_receita', {
      p_id: randomUUID(), p_valor_centavos: 1000, p_categoria_id: SALARIO_DE_A, p_conta_id: NUBANK_DE_A,
    });
    expect(r.error).not.toBeNull();
  });
});
