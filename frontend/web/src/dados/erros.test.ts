import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { lerResposta } from '../../test/apoio/fetchSimulado';
import { traduzirErro } from './erros';

describe('traduzirErro', () => {
  it('TypeError do fetch é erro de rede', () => {
    expect(traduzirErro(new TypeError('Failed to fetch'))).toEqual({ tipo: 'rede' });
  });

  it('AuthRetryableFetchError é erro de rede', () => {
    expect(traduzirErro(new AuthRetryableFetchError('Failed to fetch', 0))).toEqual({ tipo: 'rede' });
  });

  it('5xx é indisponível', () => {
    const corpo = lerResposta<{ message: string }>('erro-servico.json');
    expect(traduzirErro(new AuthApiError(corpo.message, 503, undefined))).toEqual({
      tipo: 'indisponivel',
    });
  });

  it.each([
    ['status 429', new AuthApiError('Too many requests', 429, undefined)],
    ['over_email_send_rate_limit', new AuthApiError('x', 429, 'over_email_send_rate_limit')],
    ['over_request_rate_limit', new AuthApiError('x', 429, 'over_request_rate_limit')],
  ])('limite de taxa do Auth (%s) é indisponível', (_nome, e) => {
    expect(traduzirErro(e)).toEqual({ tipo: 'indisponivel' });
  });

  it('erro de regra do PostgREST vira o código do contrato', () => {
    expect(traduzirErro(lerResposta('erro-registro-invalido.json'))).toEqual({
      tipo: 'regra',
      codigo: 'registro_invalido',
    });
  });

  it('message fora da lista é desconhecido e não repassa o texto do servidor', () => {
    const r = traduzirErro({ code: 'P0001', message: 'texto qualquer do servidor', details: null, hint: null });
    expect(r).toEqual({ tipo: 'desconhecido' });
    expect(JSON.stringify(r)).not.toContain('texto qualquer');
  });

  it('valor que não é erro é desconhecido', () => {
    expect(traduzirErro(undefined)).toEqual({ tipo: 'desconhecido' });
    expect(traduzirErro('falhou')).toEqual({ tipo: 'desconhecido' });
  });

  it('credenciais inválidas do Auth viram credenciais_invalidas', () => {
    const e = new AuthApiError('Invalid login credentials', 400, 'invalid_credentials');
    expect(traduzirErro(e)).toEqual({ tipo: 'regra', codigo: 'credenciais_invalidas' });
  });

  it('senha fraca do Auth vira senha_fraca', () => {
    const e = new AuthApiError('Password is too weak', 422, 'weak_password');
    expect(traduzirErro(e)).toEqual({ tipo: 'regra', codigo: 'senha_fraca' });
  });

  it('link de recuperação expirado vira link_expirado', () => {
    const e = new AuthApiError('Email link is invalid or has expired', 403, 'otp_expired');
    expect(traduzirErro(e)).toEqual({ tipo: 'regra', codigo: 'link_expirado' });
  });
});
