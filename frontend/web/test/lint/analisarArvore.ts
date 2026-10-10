import { fileURLToPath } from 'node:url';
import { ESLint, type Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import { regrasFronteira } from '../../eslint.fronteiras.js';

const raizArvore = fileURLToPath(new URL('./arvore/', import.meta.url));
const raizSrc = fileURLToPath(new URL('./arvore/src', import.meta.url));

export type MensagensPorArquivo = (relativoASrc: string) => Linter.LintMessage[];

/** Roda as regras de fronteira reais sobre a árvore-fixture e devolve as mensagens por arquivo. */
export async function analisarArvore(): Promise<MensagensPorArquivo> {
  const eslint = new ESLint({
    cwd: raizArvore,
    overrideConfigFile: true,
    overrideConfig: [
      { files: ['**/*.{ts,tsx}'], languageOptions: { parser: tseslint.parser } },
      ...regrasFronteira(raizSrc),
    ],
  });
  const lista = await eslint.lintFiles(['src/**/*.ts']);
  const porArquivo = new Map(
    lista.map((r) => [r.filePath.slice(raizSrc.length + 1).replaceAll('\\', '/'), r.messages]),
  );
  return (relativo) => {
    const mensagens = porArquivo.get(relativo);
    if (!mensagens) throw new Error(`arquivo não foi analisado: ${relativo}`);
    return mensagens;
  };
}
