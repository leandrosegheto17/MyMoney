import { describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { comoA, comoAnon, comoB } from '../src/sessoes';

const COMPARTILHADA = 'f6a00000-0000-4000-8000-000000000001';
const INDIVIDUAL = 'f6a00000-0000-4000-8000-000000000002';
const ALEATORIO = '0f0f0f0f-0000-4000-8000-000000000149';

interface LinhaMeta {
  id: string;
  guardado_centavos: number;
}

describe('api.salvar_meta', () => {
  it('A cria compartilhada e individual; B vê só a compartilhada', async () => {
    const a = await comoA();
    const c = await a.rpc('salvar_meta', { p_id: COMPARTILHADA, p_nome: 'Viagem teste', p_alvo_centavos: 100000, p_prazo: '2027-07-20', p_escopo: 'conjunto' });
    expect(c.error).toBeNull();
    expect(c.data).toBe(COMPARTILHADA);
    const i = await a.rpc('salvar_meta', { p_id: INDIVIDUAL, p_nome: 'Solo teste', p_alvo_centavos: 50000, p_escopo: 'individual' });
    expect(i.error).toBeNull();

    const { data, error } = await (await comoB()).from('metas').select('id,guardado_centavos');
    expect(error).toBeNull();
    const ids = (data as LinhaMeta[]).map((m) => m.id);
    expect(ids).toContain(COMPARTILHADA);
    expect(ids).not.toContain(INDIVIDUAL);
  });

  it('reenvio idêntico devolve o mesmo id', async () => {
    const r = await (await comoA()).rpc('salvar_meta', { p_id: COMPARTILHADA, p_nome: 'Viagem teste', p_alvo_centavos: 100000, p_prazo: '2027-07-20', p_escopo: 'conjunto' });
    expect(r.error).toBeNull();
    expect(r.data).toBe(COMPARTILHADA);
  });

  it('escopo não muda na edição', async () => {
    const r = await (await comoA()).rpc('salvar_meta', { p_id: COMPARTILHADA, p_nome: 'Viagem teste', p_alvo_centavos: 100000, p_escopo: 'individual' });
    expect(r.error?.message).toBe('valor_invalido');
  });

  it('B tentando criar com o id da individual de A recebe registro_invalido', async () => {
    await esperarRegistroInvalido(
      (await comoB()).rpc('salvar_meta', { p_id: INDIVIDUAL, p_nome: 'Tomada', p_alvo_centavos: 1, p_escopo: 'individual' }),
    );
  });

  it('B editando a individual de A recebe a mesma resposta de id inexistente', async () => {
    const b = await comoB();
    const alheia = await b.rpc('salvar_meta', { p_id: INDIVIDUAL, p_nome: 'Tomada', p_alvo_centavos: 1 });
    const inexistente = await b.rpc('salvar_meta', { p_id: ALEATORIO, p_nome: 'Tomada', p_alvo_centavos: 1 });
    expect(alheia.error).not.toBeNull();
    expect(alheia.error?.message).toBe(inexistente.error?.message);
    expect(alheia.error?.code).toBe(inexistente.error?.code);
  });

  it('anon não executa', async () => {
    const r = await (await comoAnon()).rpc('salvar_meta', { p_id: ALEATORIO, p_nome: 'x', p_alvo_centavos: 1, p_escopo: 'conjunto' });
    expect(r.error).not.toBeNull();
  });
});
