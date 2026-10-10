import { describe, expect, it } from 'vitest';
import { compararGerado } from './gerar.mjs';

const MENSAGEM = 'contrato desatualizado: rode pnpm contrato:gerar';

describe('compararGerado', () => {
  it('conteúdo igual passa', () => {
    const texto = 'export type Json = string;\nexport type Database = {};\n';
    expect(compararGerado(texto, texto)).toMatchObject({ ok: true });
  });

  it('conteúdo diferente falha com a mensagem', () => {
    const resultado = compararGerado('export type A = 1;\n', 'export type A = 2;\n');
    expect(resultado).toMatchObject({ ok: false, mensagem: MENSAGEM });
  });

  it('linha a mais no arquivo versionado falha', () => {
    const novo = 'export type A = 1;\n';
    expect(compararGerado(novo + '// editado à mão\n', novo)).toMatchObject({ ok: false, mensagem: MENSAGEM });
  });

  it('CRLF e LF com o mesmo texto são iguais', () => {
    const lf = 'export type A = 1;\nexport type B = 2;\n';
    const crlf = lf.replace(/\n/g, '\r\n');
    expect(compararGerado(crlf, lf)).toMatchObject({ ok: true });
    expect(compararGerado(lf, crlf)).toMatchObject({ ok: true });
  });
});
