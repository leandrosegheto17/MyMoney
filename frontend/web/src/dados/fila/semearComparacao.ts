import { modoComparacao, sessaoFalsa } from '../modoComparacao';
import { gravarItem, lerTodos, removerItem } from './armazem';
import type { ItemFila } from './tipos';

/**
 * Só no modo `sessao-falsa` do `visual`: troca a fila do aparelho pelos itens de
 * `/comparacao/fila-offline` (vazia por padrão), com o dono da sessão falsa, antes da
 * primeira renderização. Dentro de `import.meta.env.DEV`, o build de produção descarta o ramo.
 */
export async function semearFilaDeComparacao(): Promise<void> {
  if (!import.meta.env.DEV || modoComparacao() !== 'sessao-falsa') return;
  try {
    const resposta = await fetch('/comparacao/fila-offline');
    if (!resposta.ok) return;
    const itens = (await resposta.json()) as ItemFila[];
    const dono = sessaoFalsa().user.id;
    for (const antigo of await lerTodos()) await removerItem(antigo.id);
    for (const item of itens) await gravarItem({ ...item, dono });
  } catch {
    // sem a resposta de comparação (servidor comum de desenvolvimento), a fila fica como está
  }
}
