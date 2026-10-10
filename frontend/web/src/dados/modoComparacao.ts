import type { Session, User } from '@supabase/supabase-js';
import contexto from '../../../../.md/mockup/respostas/contexto.json';
import usuario from '../../../../.md/mockup/respostas/auth-usuario.json';

// Modo só do `visual` (comparação com o mockup). Todo ramo que depende dele fica dentro de
// `import.meta.env.DEV`: o build de produção o troca por `false` e o código sai do bundle.
// A variável é lida literalmente (sem acesso dinâmico a `import.meta.env[...]`).

export type ModoComparacao = 'sessao-falsa' | 'sem-sessao';

export function modoComparacao(): ModoComparacao | null {
  if (import.meta.env.DEV) {
    const valor = import.meta.env.VITE_MODO_COMPARACAO;
    if (valor === 'sessao-falsa' || valor === 'sem-sessao') return valor;
  }
  return null;
}

/** Sessão inventada: token não assinado (o PostgREST recusa) e validade longa. */
export function sessaoFalsa(): Session {
  return {
    access_token: 'token-de-comparacao-nao-assinado',
    token_type: 'bearer',
    expires_in: 30 * 24 * 3600,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
    refresh_token: 'renovacao-de-comparacao',
    user: usuario as unknown as User,
  };
}

/** `undefined`: modo desligado (vale o comportamento normal); `null`: sem sessão; senão, a sessão falsa. */
export function sessaoDoModo(): Session | null | undefined {
  if (import.meta.env.DEV) {
    const modo = modoComparacao();
    if (modo === 'sessao-falsa') return sessaoFalsa();
    if (modo === 'sem-sessao') return null;
  }
  return undefined;
}

/** Token para o cliente de dados; `undefined` fora do modo `sessao-falsa`. */
export function tokenDoModo(): string | undefined {
  if (import.meta.env.DEV && modoComparacao() === 'sessao-falsa') return sessaoFalsa().access_token;
  return undefined;
}

const MARCA_RELOGIO = Symbol.for('mymoney.relogio-de-comparacao');

/** Faz o app enxergar "agora" a partir de `hoje` de contexto.json (meio-dia em São Paulo), seguindo o tempo real. */
function fixarRelogio(): void {
  const Original = globalThis.Date;
  if ((Original as unknown as Record<symbol, unknown>)[MARCA_RELOGIO]) return;
  const inicio = Date.parse(`${contexto.hoje}T15:00:00Z`);
  const deslocamento = inicio - Original.now();
  class DataDeComparacao extends Original {
    constructor(...args: unknown[]) {
      // @ts-expect-error repasse dos argumentos do construtor nativo
      super(...(args.length === 0 ? [Original.now() + deslocamento] : args));
    }
    static override now(): number {
      return Original.now() + deslocamento;
    }
  }
  Object.defineProperty(DataDeComparacao, MARCA_RELOGIO, { value: true });
  globalThis.Date = DataDeComparacao as DateConstructor;
}

if (import.meta.env.DEV && modoComparacao() !== null) fixarRelogio();
