import type { Session } from '@supabase/supabase-js';
import { obterCliente } from './cliente';
import { traduzirErro } from './erros';
import { apagarCache } from './local/cacheDadosLancamento';
import { sessaoDoModo } from './modoComparacao';

/** Ponto único de leitura da sessão: tudo que precisa dela passa por aqui. */
export async function obterSessao(): Promise<Session | null> {
  const doModo = sessaoDoModo();
  if (doModo !== undefined) return doModo;
  const { data, error } = await obterCliente().auth.getSession();
  if (error) throw traduzirErro(error);
  return data.session;
}

/** Em modo de comparação visual nenhuma operação de sessão chega ao Auth. */
const semRede = () => sessaoDoModo() !== undefined;

function conferir(error: unknown): void {
  if (error) throw traduzirErro(error);
}

export async function entrar(email: string, senha: string): Promise<void> {
  if (semRede()) return;
  const { error } = await obterCliente().auth.signInWithPassword({ email, password: senha });
  conferir(error);
}

/** Encerra só esta sessão (ADR-008 §3). */
export async function sair(): Promise<void> {
  if (semRede()) return;
  const { error } = await obterCliente().auth.signOut({ scope: 'local' });
  conferir(error);
  await apagarCache();
}

export async function sairDeTodos(): Promise<void> {
  if (semRede()) return;
  const { error } = await obterCliente().auth.signOut({ scope: 'global' });
  conferir(error);
  await apagarCache();
}

/**
 * Resultado neutro: "usuário não existe" não muda a resposta (sem enumeração de e-mails);
 * rede, indisponibilidade e limite de taxa (traduzido como indisponível) são propagados.
 */
export async function pedirRedefinicao(email: string): Promise<void> {
  if (semRede()) return;
  const { error } = await obterCliente().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/redefinir-senha`,
  });
  if (!error) return;
  const traduzido = traduzirErro(error);
  if (traduzido.tipo === 'rede' || traduzido.tipo === 'indisponivel') throw traduzido;
}

export async function salvarNovaSenha(senha: string): Promise<void> {
  if (semRede()) return;
  const { error } = await obterCliente().auth.updateUser({ password: senha });
  conferir(error);
}

/** Notifica a sessão atual (ou `null`) e cada mudança; devolve o cancelamento. */
export function ouvirSessao(aoMudar: (sessao: Session | null) => void): () => void {
  const doModo = sessaoDoModo();
  if (doModo !== undefined) {
    let ativo = true;
    queueMicrotask(() => ativo && aoMudar(doModo));
    return () => {
      ativo = false;
    };
  }
  const { data } = obterCliente().auth.onAuthStateChange((_evento, sessao) => aoMudar(sessao));
  return () => data.subscription.unsubscribe();
}
