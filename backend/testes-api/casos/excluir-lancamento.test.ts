import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

const MERCADO_CONJUNTA = '00000000-0000-4000-8000-000000000401';
const TRANSPORTE_INDIVIDUAL_DE_A = '00000000-0000-4000-8000-000000000413';
const PIX_DE_A = '00000000-0000-4000-8000-000000000301';
const CREDITO_DE_A = '00000000-0000-4000-8000-000000000303';
const INDIVIDUAL_DE_A = '00000000-0000-4000-8000-000000000522';

async function lancarComoA(categoria: string, forma: string, parcelas = 1): Promise<string> {
  const id = randomUUID();
  const { error } = await (await comoA()).rpc('lancar_despesa', {
    p_id: id,
    p_valor_centavos: 9000,
    p_categoria_id: categoria,
    p_forma_id: forma,
    p_parcelas: parcelas,
    p_data: '2026-10-15',
  });
  expect(error).toBeNull();
  return id;
}

describe('api.excluir_lancamento', () => {
  it('A cria e exclui; depois o detalhe dá registro_invalido', async () => {
    const id = await lancarComoA(TRANSPORTE_INDIVIDUAL_DE_A, CREDITO_DE_A, 3);
    const a = await comoA();
    expect((await a.rpc('excluir_lancamento', { p_id: id })).error).toBeNull();
    await esperarRegistroInvalido(a.rpc('lancamento', { p_id: id }));
  });

  it('B não exclui individual de A e ela continua visível para A', async () => {
    await esperarRegistroInvalido(
      (await comoB()).rpc('excluir_lancamento', { p_id: INDIVIDUAL_DE_A }),
    );
    const { data, error } = await (await comoA()).rpc('lancamento', { p_id: INDIVIDUAL_DE_A });
    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it('B exclui conjunta criada por A', async () => {
    const id = await lancarComoA(MERCADO_CONJUNTA, PIX_DE_A);
    expect((await (await comoB()).rpc('excluir_lancamento', { p_id: id })).error).toBeNull();
    await esperarRegistroInvalido((await comoA()).rpc('lancamento', { p_id: id }));
  });

  it('excluir de novo ou id inexistente dá registro_invalido', async () => {
    await esperarRegistroInvalido(
      (await comoA()).rpc('excluir_lancamento', { p_id: randomUUID() }),
    );
  });

  it('usuário sem membro recebe registro_invalido', async () => {
    await esperarRegistroInvalido(
      (await comoSemMembro()).rpc('excluir_lancamento', { p_id: INDIVIDUAL_DE_A }),
    );
  });

  it('anon não executa', async () => {
    const { error } = await (await comoAnon()).rpc('excluir_lancamento', { p_id: INDIVIDUAL_DE_A });
    expect(error).not.toBeNull();
  });
});
