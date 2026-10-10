import { describe, expect, it } from 'vitest';
import exemplo from '../../../.md/mockup/respostas/contexto.json';
import { esperarRegistroInvalido } from '../src/esperar';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB, comoSemMembro, obterAmbiente } from '../src/sessoes';

interface Contexto {
  membro: { id: string; nome: string; email: string };
  outro_membro: { nome: string };
  mes_corrente: string;
  hoje: string;
}

describe('api.contexto', () => {
  it('A recebe o próprio id e "Ana" como outro membro', async () => {
    const { data, error } = await (await comoA()).rpc('contexto');
    expect(error).toBeNull();
    const ctx = data as Contexto;
    expect(ctx.membro.id).toBe(exemplo.membro.id);
    expect(ctx.membro.email).toBe(obterAmbiente().emailA);
    expect(ctx.outro_membro.nome).toBe('Ana');
  });

  it('B recebe o simétrico e nenhum vê o id do outro', async () => {
    const a = (await (await comoA()).rpc('contexto')).data as Contexto;
    const b = (await (await comoB()).rpc('contexto')).data as Contexto;
    expect(b.membro.nome).toBe('Ana');
    expect(b.outro_membro.nome).toBe('Leandro');
    expect(b.membro.id).not.toBe(a.membro.id);
    expect(JSON.stringify(a)).not.toContain(b.membro.id);
    expect(JSON.stringify(b)).not.toContain(a.membro.id);
  });

  it('a forma bate com a resposta do mockup', async () => {
    const { data } = await (await comoA()).rpc('contexto');
    mesmaForma(data, exemplo);
  });

  it('anon falha', async () => {
    const { data, error } = await (await comoAnon()).rpc('contexto');
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it('usuário sem membro não obtém nada', async () => {
    await esperarRegistroInvalido((await comoSemMembro()).rpc('contexto'));
  });
});
