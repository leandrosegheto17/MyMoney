import { describe, expect, it } from 'vitest';
import exemplo from '../../../.md/mockup/respostas/locais-guardados.json';
import { esperarRegistroInvalido } from '../src/esperar';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

describe('api.locais_guardados', () => {
  it('A recebe os locais das metas visíveis, no formato do exemplo', async () => {
    const { data, error } = await (await comoA()).rpc('locais_guardados');
    expect(error).toBeNull();
    expect(data).toEqual(['Caixinha Nubank', 'CDB Banco Inter']);
    mesmaForma(data, exemplo);
  });

  it('B recebe o local da própria individual e os da compartilhada; A não recebe o de Ana', async () => {
    const b = await (await comoB()).rpc('locais_guardados');
    expect(b.error).toBeNull();
    expect(b.data).toEqual(expect.arrayContaining(['Poupança Ana', 'Caixinha Nubank', 'CDB Banco Inter']));
    const a = await (await comoA()).rpc('locais_guardados');
    expect(a.data).not.toContain('Poupança Ana');
  });

  it('usuário sem membro não obtém locais', async () => {
    await esperarRegistroInvalido((await comoSemMembro()).rpc('locais_guardados'));
  });

  it('anon não executa', async () => {
    const { data, error } = await (await comoAnon()).rpc('locais_guardados');
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
