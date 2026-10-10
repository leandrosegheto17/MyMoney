import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import contas from '../../../.md/mockup/respostas/contas.json';
import { esperarRegistroInvalido } from '../src/esperar';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB } from '../src/sessoes';

const ITAU = '00000000-0000-4000-8000-000000000202';
const CARTAO_XP = '00000000-0000-4000-8000-000000000303';
const CONTA_DE_ANA = '00000000-0000-4000-8000-000000000211';
const FORMA_INEXISTENTE = '00000000-0000-4000-8000-00000000fff1';

interface LinhaConta {
  id: string;
  saldo_centavos: number;
}

async function saldoItau(): Promise<number> {
  const { data, error } = await (await comoA()).from('contas').select().eq('id', ITAU);
  expect(error).toBeNull();
  const linhas = data as unknown as LinhaConta[];
  expect(linhas).toHaveLength(1);
  mesmaForma(linhas, contas);
  const [linha] = linhas;
  if (linha === undefined) throw new Error('conta Itaú ausente');
  return linha.saldo_centavos;
}

describe('api.registrar_pagamento_cartao', () => {
  it('A paga o cartão e o saldo da conta cai o valor, sem duplicar no reenvio', async () => {
    const antes = await saldoItau();
    const id = randomUUID();
    const args = { p_id: id, p_forma_id: CARTAO_XP, p_conta_id: ITAU, p_valor_centavos: 12345 };
    const a = await comoA();

    const r = await a.rpc('registrar_pagamento_cartao', args);
    expect(r.error).toBeNull();
    expect(r.data).toBe(id);
    expect(await saldoItau()).toBe(antes - 12345);

    const repetido = await a.rpc('registrar_pagamento_cartao', args);
    expect(repetido.error).toBeNull();
    expect(repetido.data).toBe(id);
    expect(await saldoItau()).toBe(antes - 12345);
  });

  it('B não paga com forma ou conta de A, nem reaproveita o id de A', async () => {
    const b = await comoB();
    await esperarRegistroInvalido(
      b.rpc('registrar_pagamento_cartao', {
        p_id: randomUUID(),
        p_forma_id: CARTAO_XP,
        p_conta_id: CONTA_DE_ANA,
        p_valor_centavos: 100,
      }),
    );
    await esperarRegistroInvalido(
      b.rpc('registrar_pagamento_cartao', {
        p_id: randomUUID(),
        p_forma_id: CARTAO_XP,
        p_conta_id: ITAU,
        p_valor_centavos: 100,
      }),
    );

    const id = randomUUID();
    const a = await comoA();
    const ok = await a.rpc('registrar_pagamento_cartao', {
      p_id: id,
      p_forma_id: CARTAO_XP,
      p_conta_id: ITAU,
      p_valor_centavos: 100,
    });
    expect(ok.error).toBeNull();
    await esperarRegistroInvalido(
      b.rpc('registrar_pagamento_cartao', {
        p_id: id,
        p_forma_id: FORMA_INEXISTENTE,
        p_conta_id: CONTA_DE_ANA,
        p_valor_centavos: 100,
      }),
    );
  });

  it('B não distingue forma de A de forma inexistente', async () => {
    const b = await comoB();
    const chamar = (forma: string) =>
      b.rpc('registrar_pagamento_cartao', {
        p_id: randomUUID(),
        p_forma_id: forma,
        p_conta_id: CONTA_DE_ANA,
        p_valor_centavos: 100,
      });
    const deA = await chamar(CARTAO_XP);
    const inexistente = await chamar(FORMA_INEXISTENTE);
    expect(deA.error?.message).toBe('registro_invalido');
    expect(inexistente.error?.message).toBe(deA.error?.message);
    expect(deA.data).toEqual(inexistente.data);
  });

  it('anon não executa', async () => {
    const { data, error } = await (
      await comoAnon()
    ).rpc('registrar_pagamento_cartao', {
      p_id: randomUUID(),
      p_forma_id: CARTAO_XP,
      p_conta_id: ITAU,
      p_valor_centavos: 100,
    });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
