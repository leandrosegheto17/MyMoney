import { describe, expect, it } from 'vitest';
import exemplo from '../../../.md/mockup/respostas/movimentos-meta.json';
import vazio from '../../../.md/mockup/respostas/movimentos-meta-vazio.json';
import { esperarRegistroInvalido } from '../src/esperar';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

const COMPARTILHADA = '00000000-0000-4000-8000-000000000902';
const INDIVIDUAL_DE_A = '00000000-0000-4000-8000-000000000903';
const SEM_MOVIMENTOS = '00000000-0000-4000-8000-000000000905';
const INDIVIDUAL_DE_ANA = '00000000-0000-4000-8000-000000000911';
const CONTA_NUBANK_DE_A = '00000000-0000-4000-8000-000000000201';
const CONTA_ITAU_DE_A = '00000000-0000-4000-8000-000000000202';
const ALEATORIO ='0f0f0f0f-0000-4000-8000-000000000000';

interface Linha {
  id: string;
  autor: { nome: string; sou_eu: boolean };
  conta?: { nome: string };
}

describe('api.movimentos_meta', () => {
  it('A vê as 7 linhas na ordem do exemplo, com conta só nas próprias', async () => {
    const { data, error } = await (await comoA()).rpc('movimentos_meta', { p_meta_id: COMPARTILHADA });
    expect(error).toBeNull();
    const linhas = data as Linha[];
    expect(linhas).toHaveLength(7);
    mesmaForma(linhas, exemplo);
    expect(linhas.map((l) => l.id)).toEqual(exemplo.map((l) => l.id));
    for (const l of linhas) {
      if (l.autor.nome === 'Leandro') {
        expect(l.autor.sou_eu).toBe(true);
        expect(l.conta?.nome).toBe('Nubank');
      } else {
        expect(l.autor.sou_eu).toBe(false);
        expect(l).not.toHaveProperty('conta');
      }
    }
  });

  it('B vê as mesmas 7 com sou_eu invertido e sem a conta de A', async () => {
    const { data, error } = await (await comoB()).rpc('movimentos_meta', { p_meta_id: COMPARTILHADA });
    expect(error).toBeNull();
    const linhas = data as Linha[];
    expect(linhas.map((l) => l.id)).toEqual(exemplo.map((l) => l.id));
    for (const l of linhas) {
      expect(l.autor.sou_eu).toBe(l.autor.nome === 'Ana');
      if (l.autor.nome === 'Leandro') expect(l).not.toHaveProperty('conta');
    }
    // "local" é texto livre do movimento ("Caixinha Nubank") e é legítimo; some só ele da busca.
    const semLocal = JSON.stringify(data, (chave, valor: unknown) => (chave === 'local' ? undefined : valor));
    for (const alheio of ['Nubank', 'Itaú', CONTA_NUBANK_DE_A, CONTA_ITAU_DE_A]) {
      expect(semLocal).not.toContain(alheio);
    }
  });

  it('meta sem movimentos devolve lista vazia', async () => {
    const { data, error } = await (await comoA()).rpc('movimentos_meta', { p_meta_id: SEM_MOVIMENTOS });
    expect(error).toBeNull();
    expect(data).toEqual([]);
    mesmaForma(data, vazio);
  });

  it('individual alheia e id inexistente dão o mesmo registro_invalido', async () => {
    await esperarRegistroInvalido((await comoB()).rpc('movimentos_meta', { p_meta_id: INDIVIDUAL_DE_A }));
    await esperarRegistroInvalido((await comoB()).rpc('movimentos_meta', { p_meta_id: ALEATORIO }));
    await esperarRegistroInvalido((await comoA()).rpc('movimentos_meta', { p_meta_id: INDIVIDUAL_DE_ANA }));
  });

  it('usuário sem membro não obtém dados', async () => {
    await esperarRegistroInvalido((await comoSemMembro()).rpc('movimentos_meta', { p_meta_id: COMPARTILHADA }));
  });

  it('anon não executa', async () => {
    const { data, error } = await (await comoAnon()).rpc('movimentos_meta', { p_meta_id: COMPARTILHADA });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
