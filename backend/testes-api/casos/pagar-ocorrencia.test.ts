import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { apagarFixas, apagarLancamentos } from '../src/limpar-fixas';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

const CONJUNTA = '00000000-0000-4000-8000-000000000401';
const PIX_DE_A = '00000000-0000-4000-8000-000000000301';
const PIX_DE_B = '00000000-0000-4000-8000-000000000311';

const fixasCriadas: string[] = [];
const pagamentosCriados: string[] = [];

type Sessao = Awaited<ReturnType<typeof comoA>>;

function mesAtual(): string {
  const agora = new Date();
  return `${agora.getUTCFullYear()}-${String(agora.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

// Cria uma fixa nova e devolve a ocorrência do mês corrente (a fixa gera a do mês ao ser salva).
async function ocorrenciaPendente(): Promise<string> {
  const descricao = `Fixa ${randomUUID()}`;
  const a = await comoA();
  const fixaId = randomUUID();
  fixasCriadas.push(fixaId);
  const criada = await a.rpc('salvar_despesa_fixa', {
    p_id: fixaId,
    p_descricao: descricao,
    p_categoria_id: CONJUNTA,
    p_valor_previsto_centavos: 12345,
    p_dia_vencimento: 10,
  });
  expect(criada.error).toBeNull();
  const lista = await a.rpc('ocorrencias_mes', { p_mes: mesAtual() });
  expect(lista.error).toBeNull();
  const itens = (lista.data as unknown as { ocorrencias: { id: string; descricao: string }[] }).ocorrencias;
  const item = itens.find((o) => o.descricao === descricao);
  expect(item).toBeDefined();
  return item!.id;
}

describe('api.pagar_ocorrencia', () => {
  afterAll(async () => {
    await apagarLancamentos(pagamentosCriados);
    await apagarFixas(fixasCriadas);
  });

  it('A paga, a ocorrência vira paga e o reenvio devolve ja_existia', async () => {
    const ocorrencia = await ocorrenciaPendente();
    const id = randomUUID();
    pagamentosCriados.push(id);
    const a = await comoA();
    const pago = await a.rpc('pagar_ocorrencia', { p_id: id, p_ocorrencia_id: ocorrencia, p_forma_id: PIX_DE_A });
    expect(pago.error).toBeNull();
    const resposta = pago.data as unknown as Record<string, unknown>;
    expect(resposta).toMatchObject({
      ocorrencia_id: ocorrencia,
      lancamento_id: id,
      situacao: 'paga',
      valor_pago_centavos: 12345,
      ja_existia: false,
    });
    for (const privado of ['forma', 'forma_pagamento_id', 'conta', 'conta_id', 'data_operacao', 'data']) {
      expect(resposta).not.toHaveProperty(privado);
    }
    const reenvio = await a.rpc('pagar_ocorrencia', { p_id: id, p_ocorrencia_id: ocorrencia, p_forma_id: PIX_DE_A });
    expect(reenvio.error).toBeNull();
    expect((reenvio.data as unknown as { ja_existia: boolean }).ja_existia).toBe(true);
  });

  it('B não paga com a forma de A, nem reenvia o id de A', async () => {
    const ocorrencia = await ocorrenciaPendente();
    const b = await comoB();
    await esperarRegistroInvalido(
      b.rpc('pagar_ocorrencia', { p_id: randomUUID(), p_ocorrencia_id: ocorrencia, p_forma_id: PIX_DE_A }),
    );
    const id = randomUUID();
    pagamentosCriados.push(id);
    const pago = await (
      await comoA()
    ).rpc('pagar_ocorrencia', { p_id: id, p_ocorrencia_id: ocorrencia, p_forma_id: PIX_DE_A });
    expect(pago.error).toBeNull();
    await esperarRegistroInvalido(
      b.rpc('pagar_ocorrencia', { p_id: id, p_ocorrencia_id: ocorrencia, p_forma_id: PIX_DE_B }),
    );
    const outra = await b.rpc('pagar_ocorrencia', {
      p_id: randomUUID(),
      p_ocorrencia_id: ocorrencia,
      p_forma_id: PIX_DE_B,
    });
    expect(outra.error?.message).toContain('ocorrencia_paga');
  });

  it('B relê o lançamento do pagamento de A sem forma, conta nem data da operação', async () => {
    const ocorrencia = await ocorrenciaPendente();
    const id = randomUUID();
    pagamentosCriados.push(id);
    const pago = await (
      await comoA()
    ).rpc('pagar_ocorrencia', { p_id: id, p_ocorrencia_id: ocorrencia, p_forma_id: PIX_DE_A });
    expect(pago.error).toBeNull();
    const lido = await (await comoB()).rpc('lancamento', { p_id: id });
    expect(lido.error).toBeNull();
    const texto = JSON.stringify(lido.data);
    for (const privado of ['forma', 'conta', 'data_operacao', PIX_DE_A]) {
      expect(texto).not.toContain(privado);
    }
  });

  it('valor 0 e ocorrência inexistente são recusados', async () => {
    const ocorrencia = await ocorrenciaPendente();
    const a = await comoA();
    const zero = await a.rpc('pagar_ocorrencia', {
      p_id: randomUUID(),
      p_ocorrencia_id: ocorrencia,
      p_forma_id: PIX_DE_A,
      p_valor_centavos: 0,
    });
    expect(zero.error?.message).toContain('valor_invalido');
    await esperarRegistroInvalido(
      a.rpc('pagar_ocorrencia', { p_id: randomUUID(), p_ocorrencia_id: randomUUID(), p_forma_id: PIX_DE_A }),
    );
  });

  it('data fora da faixa plausível é recusada; hoje é aceita e o reenvio segue idempotente', async () => {
    const ocorrencia = await ocorrenciaPendente();
    const a = await comoA();
    for (const p_data of ['9999-12-31', '1900-01-01']) {
      const recusada = await a.rpc('pagar_ocorrencia', {
        p_id: randomUUID(),
        p_ocorrencia_id: ocorrencia,
        p_forma_id: PIX_DE_A,
        p_data,
      });
      expect(recusada.error?.message).toContain('valor_invalido');
    }
    const id = randomUUID();
    pagamentosCriados.push(id);
    const hoje = new Date().toISOString().slice(0, 10);
    const args = { p_id: id, p_ocorrencia_id: ocorrencia, p_forma_id: PIX_DE_A, p_data: hoje };
    const pago = await a.rpc('pagar_ocorrencia', args);
    expect(pago.error).toBeNull();
    const reenvio = await a.rpc('pagar_ocorrencia', args);
    expect(reenvio.error).toBeNull();
    expect((reenvio.data as unknown as { ja_existia: boolean }).ja_existia).toBe(true);
  });

  it('usuário sem membro recebe registro_invalido', async () => {
    const sessao: Sessao = await comoSemMembro();
    await esperarRegistroInvalido(
      sessao.rpc('pagar_ocorrencia', { p_id: randomUUID(), p_ocorrencia_id: randomUUID(), p_forma_id: PIX_DE_A }),
    );
  });

  it('anon não executa', async () => {
    const { error } = await (
      await comoAnon()
    ).rpc('pagar_ocorrencia', {
      p_id: randomUUID(),
      p_ocorrencia_id: randomUUID(),
      p_forma_id: PIX_DE_A,
    });
    expect(error).not.toBeNull();
  });
});
