import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

const MERCADO_CONJUNTA = '00000000-0000-4000-8000-000000000401';
const TRANSPORTE_INDIVIDUAL_DE_A = '00000000-0000-4000-8000-000000000413';
const CREDITO_DE_A = '00000000-0000-4000-8000-000000000303';

async function lancarNoCredito(categoria: string): Promise<string> {
  const id = randomUUID();
  const { error } = await (
    await comoA()
  ).rpc('lancar_despesa', {
    p_id: id,
    p_valor_centavos: 9000,
    p_categoria_id: categoria,
    p_forma_id: CREDITO_DE_A,
    p_parcelas: 3,
    p_data: '2026-10-15',
  });
  expect(error).toBeNull();
  return id;
}

async function parcelaDois(lancamentoId: string): Promise<{ id: string; data: string }> {
  const { data, error } = await (await comoA()).rpc('lancamento', { p_id: lancamentoId });
  expect(error).toBeNull();
  const parcelas = (data as { parcelas: { id: string; numero: number; data: string }[] }).parcelas;
  const p = parcelas.find((x) => x.numero === 2);
  expect(p).toBeDefined();
  return { id: p!.id, data: p!.data };
}

describe('api.alterar_data_parcela', () => {
  it('A altera a própria parcela e o detalhe mostra a data nova ajustada', async () => {
    const lanc = await lancarNoCredito(MERCADO_CONJUNTA);
    const p = await parcelaDois(lanc);
    const a = await comoA();
    expect((await a.rpc('alterar_data_parcela', { p_parcela_id: p.id, p_data: '2027-02-05' })).error).toBeNull();
    const { data } = await a.rpc('lancamento', { p_id: lanc });
    const nova = (data as { parcelas: { id: string; data: string; data_ajustada: boolean }[] }).parcelas.find(
      (x) => x.id === p.id,
    );
    expect(nova?.data).toBe('2027-02-05');
    expect(nova?.data_ajustada).toBe(true);
  });

  it('B não altera parcela da conjunta nem da individual de A, e A relê a data original', async () => {
    const lancamentos = [await lancarNoCredito(MERCADO_CONJUNTA), await lancarNoCredito(TRANSPORTE_INDIVIDUAL_DE_A)];
    const b = await comoB();
    for (const lanc of lancamentos) {
      const p = await parcelaDois(lanc);
      await esperarRegistroInvalido(b.rpc('alterar_data_parcela', { p_parcela_id: p.id, p_data: '2027-03-01' }));
      expect((await parcelaDois(lanc)).data).toBe(p.data);
    }
  });

  it('B recebe a mesma resposta para id real e inexistente', async () => {
    const real = await parcelaDois(await lancarNoCredito(MERCADO_CONJUNTA));
    const b = await comoB();
    await esperarRegistroInvalido(b.rpc('alterar_data_parcela', { p_parcela_id: real.id, p_data: '2027-03-01' }));
    await esperarRegistroInvalido(b.rpc('alterar_data_parcela', { p_parcela_id: randomUUID(), p_data: '2027-03-01' }));
  });

  it('usuário sem membro recebe registro_invalido', async () => {
    await esperarRegistroInvalido(
      (await comoSemMembro()).rpc('alterar_data_parcela', {
        p_parcela_id: randomUUID(),
        p_data: '2027-03-01',
      }),
    );
  });

  it('anon não executa', async () => {
    const { error } = await (
      await comoAnon()
    ).rpc('alterar_data_parcela', {
      p_parcela_id: randomUUID(),
      p_data: '2027-03-01',
    });
    expect(error).not.toBeNull();
  });
});
