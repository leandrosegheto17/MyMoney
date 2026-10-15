import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

const GRAVES = new Set(['serious', 'critical']);

/** Roda o axe na página e falha se houver violação *serious* ou *critical* (G-19). */
export async function semViolacoesGraves(page: Page, opcoes: { incluir?: string } = {}): Promise<void> {
  // A folha entra com fade; o axe medido no meio dele mistura a cor do texto com o fundo.
  // Só as finitas: o spinner de "carregando" gira para sempre e nunca termina.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  let construtor = new AxeBuilder({ page });
  if (opcoes.incluir) construtor = construtor.include(opcoes.incluir);
  const { violations } = await construtor.analyze();
  const graves = violations
    .filter((v) => v.impact && GRAVES.has(v.impact))
    .map((v) => ({
      regra: v.id,
      impacto: v.impact,
      ajuda: v.help,
      alvos: v.nodes.map((n) => n.target.join(' ')),
    }));
  expect(graves, 'violações graves de acessibilidade').toEqual([]);
}
