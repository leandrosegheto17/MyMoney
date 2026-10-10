import { describe, expect, it } from 'vitest';
import exemplo from '../../../.md/mockup/respostas/movimentos-meta.json';
import { esperarRegistroInvalido } from '../src/esperar';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB } from '../src/sessoes';

const META = 'f6b00000-0000-4000-8000-000000000150';
const INDIVIDUAL_DE_A = '00000000-0000-4000-8000-000000000903';
const CONTA_NUBANK_DE_A = '00000000-0000-4000-8000-000000000201';
const APORTE = 'f6b00000-0000-4000-8000-000000000a01';
const ALEATORIO = '0f0f0f0f-0000-4000-8000-000000000150';

interface Linha {
  id: string;
  conta?: unknown;
}

describe('api.movimentar_meta', () => {
  it('A aporta com conta na compartilhada e a resposta é só o uuid', async () => {
    const a = await comoA();
    const meta = await a.rpc('salvar_meta', { p_id: META, p_nome: 'Meta do aporte', p_alvo_centavos: 100000, p_escopo: 'conjunto' });
    expect(meta.error).toBeNull();
    const r = await a.rpc('movimentar_meta', {
      p_id: APORTE, p_meta_id: META, p_tipo: 'aporte', p_valor_centavos: 30000, p_local: 'Caixinha Nubank', p_conta_id: CONTA_NUBANK_DE_A,
    });
    expect(r.error).toBeNull();
    expect(r.data).toBe(APORTE);
  });

  it('reenvio devolve o mesmo id sem duplicar', async () => {
    const a = await comoA();
    const r = await a.rpc('movimentar_meta', {
      p_id: APORTE, p_meta_id: META, p_tipo: 'aporte', p_valor_centavos: 30000, p_local: 'Caixinha Nubank', p_conta_id: CONTA_NUBANK_DE_A,
    });
    expect(r.error).toBeNull();
    expect(r.data).toBe(APORTE);
    const { data } = await a.rpc('movimentos_meta', { p_meta_id: META });
    expect((data as Linha[]).filter((l) => l.id === APORTE)).toHaveLength(1);
  });

  it('B vê o aporte de A sem a conta (RN-08) e na mesma forma do contrato', async () => {
    const { data, error } = await (await comoB()).rpc('movimentos_meta', { p_meta_id: META });
    expect(error).toBeNull();
    const linhas = data as Linha[];
    const linha = linhas.find((l) => l.id === APORTE);
    expect(linha).toBeDefined();
    expect(linha).not.toHaveProperty('conta');
    mesmaForma([linha], [exemplo[1]]);
    expect(JSON.stringify(data)).not.toContain(CONTA_NUBANK_DE_A);
  });

  it('retirada maior que o guardado no local é recusada no campo', async () => {
    const r = await (await comoA()).rpc('movimentar_meta', {
      p_id: 'f6b00000-0000-4000-8000-000000000a02', p_meta_id: META, p_tipo: 'retirada', p_valor_centavos: 30001, p_local: 'Caixinha Nubank',
    });
    expect(r.error?.message).toBe('retirada_maior_que_guardado');
  });

  it('B não movimenta a individual de A nem usa a conta de A, com a mesma resposta de id inexistente', async () => {
    const b = await comoB();
    await esperarRegistroInvalido(
      b.rpc('movimentar_meta', { p_id: 'f6b00000-0000-4000-8000-000000000b01', p_meta_id: INDIVIDUAL_DE_A, p_tipo: 'aporte', p_valor_centavos: 100, p_local: 'Cofre' }),
    );
    await esperarRegistroInvalido(
      b.rpc('movimentar_meta', { p_id: 'f6b00000-0000-4000-8000-000000000b02', p_meta_id: META, p_tipo: 'aporte', p_valor_centavos: 100, p_local: 'Cofre', p_conta_id: CONTA_NUBANK_DE_A }),
    );
    await esperarRegistroInvalido(
      b.rpc('movimentar_meta', { p_id: 'f6b00000-0000-4000-8000-000000000b03', p_meta_id: ALEATORIO, p_tipo: 'aporte', p_valor_centavos: 100, p_local: 'Cofre' }),
    );
    await esperarRegistroInvalido(
      b.rpc('movimentar_meta', { p_id: APORTE, p_meta_id: META, p_tipo: 'aporte', p_valor_centavos: 30000, p_local: 'Caixinha Nubank' }),
    );
  });

  it('valor zero é recusado', async () => {
    const r = await (await comoA()).rpc('movimentar_meta', {
      p_id: 'f6b00000-0000-4000-8000-000000000b04', p_meta_id: META, p_tipo: 'aporte', p_valor_centavos: 0, p_local: 'Cofre',
    });
    expect(r.error?.message).toBe('valor_invalido');
  });

  it('anon não executa', async () => {
    const { data, error } = await (await comoAnon()).rpc('movimentar_meta', {
      p_id: ALEATORIO, p_meta_id: META, p_tipo: 'aporte', p_valor_centavos: 100, p_local: 'Cofre',
    });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
