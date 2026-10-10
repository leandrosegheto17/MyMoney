import { describe, expect, it } from 'vitest';
import outroMembro from '../../../.md/mockup/respostas/lancamento-outro-membro.json';
import pagador from '../../../.md/mockup/respostas/lancamento-pagador.json';
import { esperarRegistroInvalido } from '../src/esperar';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

const conjuntaDeA = '00000000-0000-4000-8000-000000000520';
const individualDeA = '00000000-0000-4000-8000-000000000522';
const receitaDeA = '00000000-0000-4000-8000-000000000524';
const idsPrivadosDeA = [
  pagador.pagamento.forma.id,
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000201',
];

describe('api.lancamento', () => {
  it('A (pagador) recebe o detalhe no formato do exemplo, com pagamento', async () => {
    const { data, error } = await (await comoA()).rpc('lancamento', { p_id: conjuntaDeA });
    expect(error).toBeNull();
    mesmaForma(data, pagador);
  });

  it('B recebe o detalhe sem a chave pagamento nem data_ajustada', async () => {
    const { data, error } = await (await comoB()).rpc('lancamento', { p_id: conjuntaDeA });
    expect(error).toBeNull();
    mesmaForma(data, outroMembro);
    expect(data).not.toHaveProperty('pagamento');
    const texto = JSON.stringify(data);
    for (const id of idsPrivadosDeA) expect(texto).not.toContain(id);
    expect(texto).not.toContain('data_ajustada');
    expect(texto).not.toContain(pagador.pagamento.data_operacao);
  });

  it('individual e receita de A pedidas por B dão registro_invalido', async () => {
    const b = await comoB();
    await esperarRegistroInvalido(b.rpc('lancamento', { p_id: individualDeA }));
    await esperarRegistroInvalido(b.rpc('lancamento', { p_id: receitaDeA }));
  });

  it('id inexistente dá o mesmo registro_invalido', async () => {
    await esperarRegistroInvalido((await comoB()).rpc('lancamento', { p_id: crypto.randomUUID() }));
  });

  it('usuário sem membro não obtém nada', async () => {
    await esperarRegistroInvalido((await comoSemMembro()).rpc('lancamento', { p_id: conjuntaDeA }));
  });

  it('anon não executa', async () => {
    const { data, error } = await (await comoAnon()).rpc('lancamento', { p_id: conjuntaDeA });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
