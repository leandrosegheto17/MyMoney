import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { apagarFixas } from '../src/limpar-fixas';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

const CONJUNTA = '00000000-0000-4000-8000-000000000401';
const PIX_DE_A = '00000000-0000-4000-8000-000000000301';

const criadas: string[] = [];

function mesAtual(): string {
  const agora = new Date();
  return `${agora.getUTCFullYear()}-${String(agora.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

// Cria uma fixa nova de A e devolve a ocorrência do mês corrente.
async function ocorrenciaPendente(): Promise<string> {
  const descricao = `Fixa ${randomUUID()}`;
  const fixa = randomUUID();
  criadas.push(fixa);
  const a = await comoA();
  const criada = await a.rpc('salvar_despesa_fixa', {
    p_id: fixa,
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

describe('api.desfazer_pagamento', () => {
  afterAll(() => apagarFixas(criadas));

  it('B não desfaz o pagamento de A e o pagamento continua', async () => {
    const ocorrencia = await ocorrenciaPendente();
    const a = await comoA();
    const pago = await a.rpc('pagar_ocorrencia', {
      p_id: randomUUID(),
      p_ocorrencia_id: ocorrencia,
      p_forma_id: PIX_DE_A,
    });
    expect(pago.error).toBeNull();
    await esperarRegistroInvalido((await comoB()).rpc('desfazer_pagamento', { p_ocorrencia_id: ocorrencia }));
    const desfeito = await a.rpc('desfazer_pagamento', { p_ocorrencia_id: ocorrencia });
    expect(desfeito.error).toBeNull();
    const repetido = await a.rpc('desfazer_pagamento', { p_ocorrencia_id: ocorrencia });
    expect(repetido.error).toBeNull();
  });

  it('ocorrência inexistente recebe registro_invalido', async () => {
    await esperarRegistroInvalido((await comoA()).rpc('desfazer_pagamento', { p_ocorrencia_id: randomUUID() }));
  });

  it('usuário sem membro recebe registro_invalido', async () => {
    await esperarRegistroInvalido((await comoSemMembro()).rpc('desfazer_pagamento', { p_ocorrencia_id: randomUUID() }));
  });

  it('anon não executa', async () => {
    const { error } = await (await comoAnon()).rpc('desfazer_pagamento', { p_ocorrencia_id: randomUUID() });
    expect(error).not.toBeNull();
  });
});
