import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import exemplo from '../../../.md/mockup/respostas/lancar-despesa-credito.json';
import { esperarRegistroInvalido } from '../src/esperar';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

const MERCADO_CONJUNTA = '00000000-0000-4000-8000-000000000401';
const TRANSPORTE_INDIVIDUAL_DE_A = '00000000-0000-4000-8000-000000000413';
const PIX_DE_A = '00000000-0000-4000-8000-000000000301';
const CREDITO_DE_A = '00000000-0000-4000-8000-000000000303';
const PIX_DE_B = '00000000-0000-4000-8000-000000000311';

describe('api.lancar_despesa', () => {
  it('A lança no crédito em 3x e a resposta tem a forma do exemplo', async () => {
    const id = randomUUID();
    const { data, error } = await (await comoA()).rpc('lancar_despesa', {
      p_id: id,
      p_valor_centavos: 36000,
      p_categoria_id: MERCADO_CONJUNTA,
      p_forma_id: CREDITO_DE_A,
      p_parcelas: 3,
      p_data: '2026-10-15',
    });
    expect(error).toBeNull();
    mesmaForma(data, exemplo);
    expect(data).toEqual({
      id,
      escopo: 'conjunto',
      categoria: 'Mercado',
      valor_total_centavos: 36000,
      num_parcelas: 3,
      primeira_parcela_data: '2026-11-10',
      ja_existia: false,
    });
  });

  it('reenvio do mesmo id devolve o mesmo resultado com ja_existia', async () => {
    const a = await comoA();
    const args = {
      p_id: randomUUID(),
      p_valor_centavos: 5000,
      p_categoria_id: MERCADO_CONJUNTA,
      p_forma_id: PIX_DE_A,
      p_data: '2026-10-20',
    };
    const primeira = await a.rpc('lancar_despesa', args);
    const segunda = await a.rpc('lancar_despesa', args);
    expect(primeira.error).toBeNull();
    expect(segunda.error).toBeNull();
    expect(segunda.data).toEqual({ ...(primeira.data as object), ja_existia: true });
  });

  it('B não usa forma, categoria individual nem id de lançamento de A', async () => {
    const a = await comoA();
    const idDeA = randomUUID();
    const idConjuntaDeA = randomUUID();
    expect(
      (await a.rpc('lancar_despesa', {
        p_id: idDeA, p_valor_centavos: 2000, p_categoria_id: TRANSPORTE_INDIVIDUAL_DE_A, p_forma_id: PIX_DE_A,
      })).error,
    ).toBeNull();
    expect(
      (await a.rpc('lancar_despesa', {
        p_id: idConjuntaDeA, p_valor_centavos: 2000, p_categoria_id: MERCADO_CONJUNTA, p_forma_id: PIX_DE_A,
      })).error,
    ).toBeNull();

    const b = await comoB();
    await esperarRegistroInvalido(
      b.rpc('lancar_despesa', { p_id: randomUUID(), p_valor_centavos: 1000, p_categoria_id: MERCADO_CONJUNTA, p_forma_id: PIX_DE_A }),
    );
    await esperarRegistroInvalido(
      b.rpc('lancar_despesa', { p_id: randomUUID(), p_valor_centavos: 1000, p_categoria_id: TRANSPORTE_INDIVIDUAL_DE_A, p_forma_id: PIX_DE_B }),
    );
    await esperarRegistroInvalido(
      b.rpc('lancar_despesa', { p_id: idDeA, p_valor_centavos: 1000, p_categoria_id: MERCADO_CONJUNTA, p_forma_id: PIX_DE_B }),
    );
    await esperarRegistroInvalido(
      b.rpc('lancar_despesa', { p_id: idConjuntaDeA, p_valor_centavos: 1000, p_categoria_id: MERCADO_CONJUNTA, p_forma_id: PIX_DE_B }),
    );
  });

  it('usuário sem membro recebe registro_invalido', async () => {
    await esperarRegistroInvalido(
      (await comoSemMembro()).rpc('lancar_despesa', {
        p_id: randomUUID(), p_valor_centavos: 1000, p_categoria_id: MERCADO_CONJUNTA, p_forma_id: PIX_DE_A,
      }),
    );
  });

  it('valor inválido é recusado com valor_invalido', async () => {
    const r = await (await comoA()).rpc('lancar_despesa', {
      p_id: randomUUID(), p_valor_centavos: 0, p_categoria_id: MERCADO_CONJUNTA, p_forma_id: PIX_DE_A,
    });
    expect(r.error?.message).toBe('valor_invalido');
  });

  it('anon não executa', async () => {
    const r = await (await comoAnon()).rpc('lancar_despesa', {
      p_id: randomUUID(), p_valor_centavos: 1000, p_categoria_id: MERCADO_CONJUNTA, p_forma_id: PIX_DE_A,
    });
    expect(r.error).not.toBeNull();
  });
});
