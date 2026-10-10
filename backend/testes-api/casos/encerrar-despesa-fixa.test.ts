import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { apagarFixas } from '../src/limpar-fixas';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

const CONJUNTA = '00000000-0000-4000-8000-000000000401';

const criadas: string[] = [];

async function criarFixaDeA() {
  const id = randomUUID();
  criadas.push(id);
  const criada = await (await comoA()).rpc('salvar_despesa_fixa', {
    p_id: id, p_descricao: 'Condomínio', p_categoria_id: CONJUNTA,
    p_valor_previsto_centavos: 45000, p_dia_vencimento: 8,
  });
  expect(criada.error).toBeNull();
  return id;
}

describe('api.encerrar_despesa_fixa', () => {
  afterAll(() => apagarFixas(criadas));

  it('B encerra a fixa de A e os dois veem encerrada_em pela view', async () => {
    const id = await criarFixaDeA();
    const encerrada = await (await comoB()).rpc('encerrar_despesa_fixa', { p_id: id });
    expect(encerrada.error).toBeNull();
    for (const sessao of [await comoA(), await comoB()]) {
      const lida = await sessao.from('despesas_fixas').select('encerrada_em').eq('id', id).single();
      expect(lida.error).toBeNull();
      expect(lida.data?.encerrada_em).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('id inexistente recebe registro_invalido', async () => {
    await esperarRegistroInvalido((await comoA()).rpc('encerrar_despesa_fixa', { p_id: randomUUID() }));
  });

  it('usuário sem membro não encerra a fixa de A', async () => {
    const id = await criarFixaDeA();
    await esperarRegistroInvalido((await comoSemMembro()).rpc('encerrar_despesa_fixa', { p_id: id }));
    const lida = await (await comoA()).from('despesas_fixas').select('encerrada_em').eq('id', id).single();
    expect(lida.data?.encerrada_em).toBeNull();
  });

  it('anon não executa', async () => {
    const { error } = await (await comoAnon()).rpc('encerrar_despesa_fixa', { p_id: randomUUID() });
    expect(error).not.toBeNull();
  });
});
