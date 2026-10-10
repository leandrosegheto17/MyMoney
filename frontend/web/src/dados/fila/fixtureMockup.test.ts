import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ItemFila } from './tipos';

const CAMINHO = new URL('../../../../../.md/mockup/respostas/fila-offline.json', import.meta.url);

// Chaves de ItemFila: o `satisfies` falha na compilação se o tipo ganhar ou perder uma chave.
const CHAVES = ['id', 'dono', 'args', 'exibicao', 'criadoEm', 'situacao', 'motivo'] as const satisfies readonly (keyof ItemFila)[];
const OBRIGATORIAS = ['id', 'dono', 'args', 'exibicao', 'criadoEm', 'situacao'];

describe('fila-offline.json do mockup', () => {
  const itens = JSON.parse(readFileSync(CAMINHO, 'utf8')) as Array<Record<string, unknown>>;

  it('tem o formato de ItemFila (criadoEm em ms, motivo ausente quando aguardando)', () => {
    expect(itens.length).toBeGreaterThan(0);
    for (const item of itens) {
      for (const chave of Object.keys(item)) expect(CHAVES as readonly string[]).toContain(chave);
      for (const chave of OBRIGATORIAS) expect(item).toHaveProperty(chave);
      expect(typeof item.criadoEm).toBe('number');
      expect(['aguardando', 'falhou']).toContain(item.situacao);
      if (item.situacao === 'aguardando') expect(item.motivo).toBeUndefined();
      expect((item.args as { p_id: string }).p_id).toBe(item.id);
    }
  });
});
