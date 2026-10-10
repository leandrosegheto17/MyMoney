import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

const CATEGORIA_CONJUNTA = '00000000-0000-4000-8000-000000000401';
const CATEGORIA_INDIVIDUAL_DE_A = '00000000-0000-4000-8000-000000000413';
const PIX_DE_A = '00000000-0000-4000-8000-000000000301';
const CREDITO_DE_A = '00000000-0000-4000-8000-000000000303';

const criados: string[] = [];

async function lancar(categoria: string, forma: string, parcelas: number): Promise<string> {
  const id = randomUUID();
  const { error } = await (
    await comoA()
  ).rpc('lancar_despesa', {
    p_id: id,
    p_valor_centavos: 9000,
    p_categoria_id: categoria,
    p_forma_id: forma,
    p_parcelas: parcelas,
    p_data: '2026-10-15',
  });
  expect(error).toBeNull();
  criados.push(id);
  return id;
}

async function detalheDeA(id: string): Promise<string> {
  const { data, error } = await (await comoA()).rpc('lancamento', { p_id: id });
  expect(error).toBeNull();
  return JSON.stringify(data);
}

describe('api.editar_lancamento', () => {
  afterAll(async () => {
    const a = await comoA();
    for (const id of criados) {
      const { error } = await a.rpc('excluir_lancamento', { p_id: id });
      expect(error).toBeNull();
    }
  });

  it('B tenta mudar forma e parcelas da conjunta de A: erro, e A relê nada mudado', async () => {
    const id = await lancar(CATEGORIA_CONJUNTA, CREDITO_DE_A, 3);
    const antes = await detalheDeA(id);
    const b = await comoB();
    const forma = await b.rpc('editar_lancamento', { p_id: id, p_forma_id: PIX_DE_A, p_num_parcelas: 1 });
    expect(forma.error?.message).toBe('sem_permissao');
    const parcelas = await b.rpc('editar_lancamento', { p_id: id, p_num_parcelas: 6 });
    expect(parcelas.error?.message).toBe('sem_permissao');
    expect(await detalheDeA(id)).toBe(antes);
  });

  it('B edita o valor da conjunta e a resposta não traz a parte privada de A', async () => {
    const id = await lancar(CATEGORIA_CONJUNTA, PIX_DE_A, 1);
    const { data, error } = await (
      await comoB()
    ).rpc('editar_lancamento', {
      p_id: id,
      p_valor_total_centavos: 12000,
    });
    expect(error).toBeNull();
    expect(Object.keys(data as object).sort()).toEqual(['alterado_em', 'escopo', 'id', 'num_parcelas']);
    const texto = JSON.stringify(data);
    for (const proibido of ['pagamento', 'forma', 'conta', 'data_operacao', PIX_DE_A]) {
      expect(texto).not.toContain(proibido);
    }
  });

  it('B em lançamento individual de A recebe registro_invalido, igual a id inexistente', async () => {
    const id = await lancar(CATEGORIA_INDIVIDUAL_DE_A, PIX_DE_A, 1);
    const b = await comoB();
    await esperarRegistroInvalido(b.rpc('editar_lancamento', { p_id: id, p_descricao: 'x' }));
    await esperarRegistroInvalido(b.rpc('editar_lancamento', { p_id: id, p_forma_id: PIX_DE_A }));
    await esperarRegistroInvalido(b.rpc('editar_lancamento', { p_id: randomUUID(), p_descricao: 'x' }));
  });

  it('A edita o próprio lançamento e o detalhe mostra o valor e o editor', async () => {
    const id = await lancar(CATEGORIA_CONJUNTA, CREDITO_DE_A, 3);
    const a = await comoA();
    const { error } = await a.rpc('editar_lancamento', { p_id: id, p_valor_total_centavos: 12000 });
    expect(error).toBeNull();
    const { data } = await a.rpc('lancamento', { p_id: id });
    const l = data as {
      parcelas: { valor_centavos: number }[];
      alterado_por: { nome: string } | null;
      alterado_em: string | null;
    };
    expect(l.parcelas.reduce((s, p) => s + p.valor_centavos, 0)).toBe(12000);
    expect(l.alterado_por?.nome).toBe('Leandro');
    expect(l.alterado_em).not.toBeNull();
  });

  it('usuário sem membro recebe registro_invalido', async () => {
    await esperarRegistroInvalido(
      (await comoSemMembro()).rpc('editar_lancamento', { p_id: randomUUID(), p_descricao: 'x' }),
    );
  });

  it('anon não executa', async () => {
    const { error } = await (await comoAnon()).rpc('editar_lancamento', { p_id: randomUUID() });
    expect(error).not.toBeNull();
  });
});
