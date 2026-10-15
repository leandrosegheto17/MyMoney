// Guarda o corpo de toda resposta da API (/rest/v1/) que a página recebe, para afirmar o que NÃO chegou
// ao navegador: dado de outro membro não pode estar nem em tela escondida nem em resposta ignorada.
import type { Page } from '@playwright/test';

export interface RespostaColetada {
  caminho: string;
  corpo: string;
}

export interface ColetorRede {
  /** Espera as leituras pendentes e devolve tudo o que chegou até agora. */
  respostas(): Promise<RespostaColetada[]>;
  /** Caminhos das respostas cujo corpo casa com algum termo (texto exato ou expressão). */
  vazamentos(termos: readonly (string | RegExp)[]): Promise<string[]>;
}

export function coletarRespostas(page: Page): ColetorRede {
  const pendentes: Promise<RespostaColetada | null>[] = [];

  page.on('response', (resposta) => {
    const { pathname } = new URL(resposta.url());
    if (!pathname.startsWith('/rest/v1/')) return;
    pendentes.push(
      resposta
        .text()
        .then((corpo) => ({ caminho: pathname, corpo }))
        .catch(() => null),
    );
  });

  const respostas = async () => (await Promise.all(pendentes)).filter((r): r is RespostaColetada => r !== null);

  return {
    respostas,
    async vazamentos(termos) {
      const achadas = (await respostas()).filter(({ corpo }) =>
        termos.some((termo) => (typeof termo === 'string' ? corpo.includes(termo) : termo.test(corpo))),
      );
      return achadas.map((r) => r.caminho);
    },
  };
}
