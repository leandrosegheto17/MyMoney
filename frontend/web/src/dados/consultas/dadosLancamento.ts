import type { DadosLancamento } from '@mymoney/contrato/respostas/dados-lancamento';
import { obterCliente } from '../cliente';
import { extrair, type ErroDados } from '../erros';
import { lerCache, salvarCache } from '../local/cacheDadosLancamento';
import { obterSessao } from '../sessao';

export type DadosLancamentoLidos = { dados: DadosLancamento; doAparelho: boolean; salvoEm: number };

const usuarioAtual = async () => (await obterSessao())?.user.id;

/** Última resposta guardada para o usuário da sessão, sem chamar a rede. */
export async function lerDadosDoAparelho(): Promise<DadosLancamentoLidos | undefined> {
  const usuario = await usuarioAtual();
  const cache = usuario === undefined ? undefined : await lerCache(usuario);
  return cache && { ...cache, doAparelho: true };
}

/** Guardar é melhor esforço: falha do armazenamento local não derruba uma resposta boa. */
async function guardar(dados: DadosLancamento): Promise<void> {
  try {
    const usuario = await usuarioAtual();
    if (usuario !== undefined) await salvarCache(usuario, dados);
  } catch {
    // sem cache no aparelho, a próxima abertura sem rede mostra o erro de rede
  }
}

/** Rede e indisponibilidade caem no cache; erro de regra ou desconhecido sobe sem tocar nele. */
export async function buscarDadosLancamento(): Promise<DadosLancamentoLidos> {
  let dados: DadosLancamento;
  try {
    dados = extrair<DadosLancamento>(await obterCliente().rpc('dados_lancamento'));
  } catch (e) {
    const erro = e as ErroDados;
    if (erro.tipo !== 'rede' && erro.tipo !== 'indisponivel') throw e;
    const doAparelho = await lerDadosDoAparelho().catch(() => undefined);
    if (doAparelho === undefined) throw e;
    return doAparelho;
  }
  await guardar(dados);
  return { dados, doAparelho: false, salvoEm: Date.now() };
}
