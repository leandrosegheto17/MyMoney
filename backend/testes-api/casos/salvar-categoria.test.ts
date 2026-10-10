import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import categoriaMercado from '../../../.md/mockup/respostas/categoria-mercado.json';
import { esperarRegistroInvalido } from '../src/esperar';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB } from '../src/sessoes';

const MERCADO_CONJUNTA = '00000000-0000-4000-8000-000000000401';
const INDIVIDUAL_DE_A = '00000000-0000-4000-8000-000000000411';

describe('api.salvar_categoria', () => {
  it('A cria uma despesa individual e a lê pela view categorias', async () => {
    const a = await comoA();
    const id = randomUUID();
    const criada = await a.rpc('salvar_categoria', {
      p_id: id,
      p_nome: `Teste ${id.slice(0, 8)}`,
      p_tipo: 'despesa',
      p_escopo: 'individual',
      p_variavel: true,
    });
    expect(criada.error).toBeNull();
    expect(criada.data).toBe(id);
    const lida = await a.from('categorias').select('*').eq('id', id).single();
    expect(lida.error).toBeNull();
    expect(lida.data).toMatchObject({ id, tipo: 'despesa', escopo: 'individual' });
    mesmaForma(lida.data, categoriaMercado[0]);
  });

  it('reenviar a mesma categoria com os mesmos dados mantém uma só linha', async () => {
    const a = await comoA();
    const dados = {
      p_id: randomUUID(),
      p_nome: 'Reenvio idêntico',
      p_tipo: 'despesa',
      p_escopo: 'individual',
      p_variavel: false,
    };
    const r1 = await a.rpc('salvar_categoria', dados);
    const r2 = await a.rpc('salvar_categoria', dados);
    expect(r1.error).toBeNull();
    expect(r2.error).toBeNull();
    expect(r2.data).toBe(dados.p_id);
    const lida = await a.from('categorias').select('*').eq('id', dados.p_id);
    expect(lida.error).toBeNull();
    expect(lida.data).toHaveLength(1);
    expect(lida.data?.[0]).toMatchObject({ nome: dados.p_nome, variavel: false });
  });

  it('receita enviada com escopo conjunto é gravada como individual', async () => {
    const a = await comoA();
    const id = randomUUID();
    const r = await a.rpc('salvar_categoria', {
      p_id: id,
      p_nome: `Receita ${id.slice(0, 8)}`,
      p_tipo: 'receita',
      p_escopo: 'conjunto',
    });
    expect(r.error).toBeNull();
    const lida = await a.from('categorias').select('*').eq('id', id).single();
    expect(lida.error).toBeNull();
    expect(lida.data).toMatchObject({ id, tipo: 'receita', escopo: 'individual' });
  });

  it('B renomeia a conjunta do seed e devolve o nome', async () => {
    const b = await comoB();
    const atual = await b.from('categorias').select('nome').eq('id', MERCADO_CONJUNTA).single();
    expect(atual.error).toBeNull();
    const nome = atual.data?.nome as string;
    const r1 = await b.rpc('salvar_categoria', {
      p_id: MERCADO_CONJUNTA,
      p_nome: 'Mercado renomeado',
      p_tipo: 'despesa',
      p_escopo: 'conjunto',
      p_variavel: true,
    });
    expect(r1.error).toBeNull();
    const r2 = await b.rpc('salvar_categoria', {
      p_id: MERCADO_CONJUNTA,
      p_nome: nome,
      p_tipo: 'despesa',
      p_escopo: 'conjunto',
      p_variavel: true,
    });
    expect(r2.error).toBeNull();
  });

  it('B não edita a individual de A', async () => {
    await esperarRegistroInvalido(
      (await comoB()).rpc('salvar_categoria', {
        p_id: INDIVIDUAL_DE_A,
        p_nome: 'Invadida',
        p_tipo: 'despesa',
        p_escopo: 'individual',
      }),
    );
  });

  it('B não cria com o id da individual de A', async () => {
    await esperarRegistroInvalido(
      (await comoB()).rpc('salvar_categoria', {
        p_id: INDIVIDUAL_DE_A,
        p_nome: 'Outra',
        p_tipo: 'despesa',
        p_escopo: 'individual',
      }),
    );
  });

  it('anon falha', async () => {
    const { error } = await (
      await comoAnon()
    ).rpc('salvar_categoria', {
      p_id: randomUUID(),
      p_nome: 'Anon',
      p_tipo: 'despesa',
      p_escopo: 'conjunto',
    });
    expect(error).not.toBeNull();
  });
});
