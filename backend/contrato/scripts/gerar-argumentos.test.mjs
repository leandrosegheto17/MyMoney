import { describe, expect, it } from 'vitest';
import { argumentosGerador } from './gerar.mjs';

describe('argumentosGerador', () => {
  it('sem variável usa o stack local e só o schema api', () => {
    const args = argumentosGerador({});
    expect(args).toContain('--local');
    expect(args).not.toContain('--db-url');
    expect(args.slice(args.indexOf('--schema'), args.indexOf('--schema') + 2)).toEqual(['--schema', 'api']);
  });

  it('aceita URL de loopback', () => {
    const url = 'postgresql://u:s@127.0.0.1:5432/descartavel';
    expect(argumentosGerador({ CONTRATO_DB_URL: url })).toEqual(expect.arrayContaining(['--db-url', url]));
  });

  it('recusa host que não é local', () => {
    expect(() => argumentosGerador({ CONTRATO_DB_URL: 'postgresql://u:s@db.exemplo.com:5432/x' })).toThrow(/local/);
  });
});
