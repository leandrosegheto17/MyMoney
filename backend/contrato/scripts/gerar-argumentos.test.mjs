import { describe, expect, it } from 'vitest';
import { argumentosGerador, gerar, mascararUrl } from './gerar.mjs';

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

  it.each([
    'postgresql://u:s@127.0.0.1:5432/x?host=db.exemplo.com',
    'postgresql://u:s@127.0.0.1:5432/x?hostaddr=10.0.0.1',
    'postgresql://u:s@127.0.0.1:5432/x?options=-c%20x',
    'postgresql://u:s@127.0.0.1:5432/x?%68ost=db.exemplo.com',
    'postgresql://u:s@127.0.0.1:5432/x#frag',
    'postgresql://u:s@127.0.0.1:5432/x y',
    'postgresql://u:s@127.0.0.1:5432\\@db.exemplo.com/x',
    'postgresql://u:s@127.0.0.1:5432/x?a=1;host=db.exemplo.com',
    'http://u:s@127.0.0.1:5432/x',
    'isto não é uma url',
  ])('recusa URL malformada ou que muda o destino: %s', (url) => {
    expect(() => argumentosGerador({ CONTRATO_DB_URL: url })).toThrow(/CONTRATO_DB_URL/);
  });

  it('a mensagem de recusa não traz a senha', () => {
    const url = 'postgresql://usuario:SenhaFicticia@db.exemplo.com:5432/x';
    expect(() => argumentosGerador({ CONTRATO_DB_URL: url })).toThrow(/^(?!.*SenhaFicticia)/s);
    expect(() => argumentosGerador({ CONTRATO_DB_URL: 'postgresql://usuario:SenhaFicticia@[::1/x' })).toThrow(
      /^(?!.*SenhaFicticia)/s,
    );
  });
});

describe('mascararUrl', () => {
  it('troca usuário:senha por ***', () => {
    expect(mascararUrl('erro em postgresql://usuario:SenhaFicticia@localhost:5432/x?a=1 fim')).toBe(
      'erro em postgresql://***@localhost:5432/x?a=1 fim',
    );
    expect(mascararUrl('postgres://u:p%40ss@127.0.0.1/x')).toBe('postgres://***@127.0.0.1/x');
  });

  it.each([
    ['postgresql://u:Yw/Tp7@h@host:5432/db', 'Yw', 'Tp7'],
    ['postgresql://u:SE@GREDO@h/x', 'SE', 'GREDO'],
    ['postgresql://u:SE/GREDO@h/x', 'SE', 'GREDO'],
    ['postgresql://u:SE?GREDO@h/x', 'SE', 'GREDO'],
    ['postgresql://u:SE#GREDO@h/x', 'SE', 'GREDO'],
    ['postgresql://u:SE%2FGREDO@h/x', 'SE', 'GREDO'],
    ['postgresql://u:SE@@GREDO@h/x', 'SE', 'GREDO'],
    ['postgresql://u:SE:GREDO@h/x', 'SE', 'GREDO'],
    ['"postgresql://u:SE@GREDO@h/x"', 'SE', 'GREDO'],
    ["erro 'postgres://u:SE/GREDO@[::1]:5432/x' fim", 'SE', 'GREDO'],
    ['postgresql://:SE/GREDO@h/x', 'SE', 'GREDO'],
  ])('não deixa fragmento da senha: %s', (entrada, parteA, parteB) => {
    const saida = mascararUrl(entrada);
    expect(saida).not.toContain(parteA);
    expect(saida).not.toContain(parteB);
    expect(saida).toContain('***@');
  });

  it('URL sem senha ou sem usuário não é alterada além do necessário', () => {
    expect(mascararUrl('postgresql://localhost:5432/x')).toBe('postgresql://localhost:5432/x');
    expect(mascararUrl('postgresql://@localhost/x')).toBe('postgresql://***@localhost/x');
  });
});

describe('gerar', () => {
  const URL_COM_SENHA = 'postgresql://usuario:SenhaFicticia@127.0.0.1:5999/descartavel';

  it('falha do comando não vaza a senha nem a URL na exceção', () => {
    const executar = () => {
      const erro = new Error(`Command failed: supabase gen types --db-url ${URL_COM_SENHA}`);
      erro.status = 1;
      erro.stderr = `failed to connect to ${URL_COM_SENHA}: connection refused`;
      throw erro;
    };
    let capturado;
    try {
      gerar({ CONTRATO_DB_URL: URL_COM_SENHA }, executar);
    } catch (erro) {
      capturado = erro;
    }
    expect(capturado).toBeInstanceOf(Error);
    const texto = [capturado.message, capturado.stack, String(capturado.cause ?? ''), capturado.stderr ?? ''].join('\n');
    expect(texto).not.toContain('SenhaFicticia');
    expect(texto).not.toContain(URL_COM_SENHA);
    expect(capturado.message).toMatch(/status 1/);
    expect(capturado.stderr).toContain('postgresql://***@127.0.0.1:5999/descartavel');
  });

  it('nunca usa shell e chama o node direto, em qualquer plataforma', () => {
    const chamadas = [];
    const executar = (comando, args, opcoes) => {
      chamadas.push({ comando, args, opcoes });
      return 'saida\r\n';
    };
    for (const plataforma of ['linux', 'win32']) {
      const original = Object.getOwnPropertyDescriptor(process, 'platform');
      Object.defineProperty(process, 'platform', { value: plataforma });
      try {
        expect(gerar({ CONTRATO_DB_URL: URL_COM_SENHA }, executar)).toBe('saida\n');
      } finally {
        Object.defineProperty(process, 'platform', original);
      }
    }
    for (const { comando, args, opcoes } of chamadas) {
      expect(opcoes.shell).toBeFalsy();
      expect(comando).toBe(process.execPath);
      expect(args[0]).toMatch(/supabase[\\/]dist[\\/]supabase\.js$/);
      expect(args).toContain(URL_COM_SENHA);
    }
  });

  it('o filho recebe env mínimo, sem segredos arbitrários, em --db-url e --local', () => {
    const base = { PATH: '/bin', HOME: '/h', HTTPS_PROXY: 'http://p', SEGREDO_X: 'x', SUPABASE_ACCESS_TOKEN: 't' };
    for (const env of [{ ...base, CONTRATO_DB_URL: URL_COM_SENHA }, base]) {
      let recebido;
      const executar = (comando, args, opcoes) => {
        recebido = opcoes.env;
        return 'saida\n';
      };
      expect(gerar(env, executar)).toBe('saida\n');
      expect(recebido).toEqual({ PATH: '/bin', HOME: '/h', HTTPS_PROXY: 'http://p' });
    }
  });

  it('URL não local nem chega a executar o comando', () => {
    const executar = () => {
      throw new Error('não deveria executar');
    };
    expect(() => gerar({ CONTRATO_DB_URL: 'postgresql://u:s@db.exemplo.com/x' }, executar)).toThrow(/local/);
  });
});
