import type { Session } from '@supabase/supabase-js';
import { obterCliente } from './cliente';
import { traduzirErro, traduzirErroDeEntrada } from './erros';
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

export type SituacaoSessao = 'valida' | 'rede' | 'revogada' | 'sem-sessao';

const MARGEM_RENOVACAO_S = 60;
/** O supabase-js repete a renovação com espera crescente; sem rede, a rodada não fica presa nisso. */
const PRAZO_RENOVACAO_MS = 3000;

function situacaoDoErro(erro: unknown): SituacaoSessao {
  const traduzido = traduzirErro(erro);
  if (traduzido.tipo === 'rede' || traduzido.tipo === 'indisponivel') return 'rede';
  const status = (erro as { status?: number } | null)?.status;
  return status === 400 || status === 401 || status === 403 ? 'revogada' : 'rede';
}

/**
 * Renova o token se faltar menos de 60 s para expirar, antes de qualquer envio da fila.
 * Nunca apaga a sessão guardada: rede fora do ar e revogação só são informadas; passado o
 * prazo de renovação, conta como rede.
 */
export async function garantirSessaoValida(): Promise<SituacaoSessao> {
  let prazo: ReturnType<typeof setTimeout> | undefined;
  const esgotado = new Promise<SituacaoSessao>((resolver) => {
    prazo = setTimeout(() => resolver('rede'), PRAZO_RENOVACAO_MS);
  });
  try {
    return await Promise.race([verificarSessao(), esgotado]);
  } finally {
    clearTimeout(prazo);
  }
}

async function verificarSessao(): Promise<SituacaoSessao> {
  const doModo = sessaoDoModo();
  if (doModo !== undefined) return doModo ? 'valida' : 'sem-sessao';
  const auth = obterCliente().auth;
  try {
    const { data, error } = await auth.getSession();
    if (error) return situacaoDoErro(error);
    if (!data.session) return 'sem-sessao';
    const restante = (data.session.expires_at ?? 0) - Date.now() / 1000;
    if (restante >= MARGEM_RENOVACAO_S) return 'valida';
    const renovada = await auth.refreshSession();
    if (renovada.error) return situacaoDoErro(renovada.error);
    return renovada.data.session ? 'valida' : 'sem-sessao';
  } catch (e) {
    return situacaoDoErro(e);
  }
}

/** Em modo de comparação visual nenhuma operação de sessão chega ao Auth. */
const semRede = () => sessaoDoModo() !== undefined;

function conferir(error: unknown): void {
  if (error) throw traduzirErro(error);
}

export async function entrar(email: string, senha: string): Promise<void> {
  if (semRede()) return;
  const { error } = await obterCliente().auth.signInWithPassword({ email, password: senha });
  if (error) throw traduzirErroDeEntrada(error);
}

/** Encerra só esta sessão (ADR-008 §3). */
export async function sair(): Promise<void> {
  if (semRede()) return;
  const { error } = await obterCliente().auth.signOut({ scope: 'local' });
  conferir(error);
  await apagarCache();
}

/** O Auth já não reconhece a sessão (ou o endpoint): não há o que revogar, só limpar o aparelho. */
const STATUS_SEM_SESSAO_NO_SERVIDOR = [401, 403, 404];

/**
 * Revoga todas as sessões no servidor com o JWT do próprio usuário, sem tocar na sessão local;
 * só depois de confirmar remove a sessão deste aparelho. Sem rede, falha e mantém sessão e cache (ADR-013).
 */
export async function sairDeTodos(): Promise<void> {
  if (semRede()) return;
  const sessao = await obterSessao();
  if (!sessao) {
    await apagarCache();
    return;
  }
  const auth = obterCliente().auth;
  const { error } = await auth.admin.signOut(sessao.access_token, 'global');
  const status = (error as { status?: number } | null)?.status;
  if (error && !(status !== undefined && STATUS_SEM_SESSAO_NO_SERVIDOR.includes(status))) {
    throw traduzirErro(error);
  }
  conferir((await auth.signOut({ scope: 'local' })).error);
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

export type EstadoRecuperacao = 'pronta' | 'expirado' | 'sem_link';

const ERROS_DE_LINK = ['otp_expired', 'access_denied'];

function linkVeioComErro(): boolean {
  const parametros = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const consulta = new URLSearchParams(window.location.search);
  const codigos = [
    parametros.get('error_code'),
    parametros.get('error'),
    consulta.get('error_code'),
    consulta.get('error'),
  ];
  return codigos.some((codigo) => codigo !== null && ERROS_DE_LINK.includes(codigo));
}

/** Lê o retorno do link de redefinição depois que o cliente de Auth termina de processar a URL. */
export async function estadoRecuperacao(): Promise<EstadoRecuperacao> {
  if (semRede()) return 'sem_link';
  const comErro = linkVeioComErro();
  const auth = obterCliente().auth;
  await auth.initialize();
  if (comErro) return 'expirado';
  const { data } = await auth.getSession();
  return data.session ? 'pronta' : 'sem_link';
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
