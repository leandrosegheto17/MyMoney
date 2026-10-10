import type { ErroDados } from '../erros';
import { lancarDespesa } from '../comandos/lancarDespesa';
import { obterSessao } from '../sessao';
import { gravarItem, lerItem, lerTodos, removerItem } from './armazem';
import type { ArgsNovoItem, EventoFila, ExibicaoItem, ItemFila } from './tipos';

/** Teto por membro: acima disso o lançamento é recusado em vez de crescer sem limite no aparelho. */
export const LIMITE_ITENS = 200;

const TRAVA_ENTRE_ABAS = 'mymoney-fila';

const ouvintes = new Set<(evento: EventoFila) => void>();
let emCurso: Promise<void> | undefined;

function emitir(evento: EventoFila) {
  for (const ouvinte of [...ouvintes]) ouvinte(evento);
}

/** O dono é sempre a sessão atual, nunca um parâmetro de quem chama. */
async function donoAtual(): Promise<string | undefined> {
  return (await obterSessao())?.user.id;
}

function lerErro(e: unknown): ErroDados {
  const tipo = (e as { tipo?: unknown } | null)?.tipo;
  if (tipo === 'rede' || tipo === 'indisponivel' || tipo === 'autenticacao') return { tipo };
  if (tipo === 'regra') return e as ErroDados;
  return { tipo: 'desconhecido' };
}

async function marcarFalha(item: ItemFila, erro: ErroDados) {
  const motivo = erro.tipo === 'regra' ? erro.codigo : 'desconhecido';
  await gravarItem({ ...item, situacao: 'falhou', motivo });
  emitir({ tipo: 'mudou' });
}

/** Um item por vez, em ordem. Rede, indisponível e autenticação encerram a rodada com o item intacto; falha de regra não bloqueia os demais. */
async function rodada() {
  const dono = await donoAtual();
  if (!dono) return;
  const pendentes = (await lerTodos()).filter((i) => i.dono === dono && i.situacao === 'aguardando');
  for (const pendente of pendentes) {
    const item = await lerItem(pendente.id);
    if (item?.dono !== dono || item.situacao !== 'aguardando') continue;
    try {
      const resposta = await lancarDespesa(item.args);
      await removerItem(item.id);
      emitir({ tipo: 'enviado', item, resposta });
      emitir({ tipo: 'mudou' });
    } catch (e) {
      const erro = lerErro(e);
      if (erro.tipo === 'rede' || erro.tipo === 'indisponivel' || erro.tipo === 'autenticacao') return;
      await marcarFalha(item, erro);
    }
  }
}

async function esvaziar(): Promise<void> {
  if (emCurso) return emCurso;
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  const execucao = locks ? locks.request(TRAVA_ENTRE_ABAS, rodada) : rodada();
  emCurso = execucao.finally(() => {
    emCurso = undefined;
  });
  return emCurso;
}

/** Grava a chamada completa (com `p_id` novo) antes de qualquer envio. Não envia. */
async function enfileirar(args: ArgsNovoItem, exibicao: ExibicaoItem): Promise<ItemFila> {
  const dono = await donoAtual();
  if (!dono) throw new Error('sem_sessao');
  const meus = (await lerTodos()).filter((i) => i.dono === dono);
  if (meus.length >= LIMITE_ITENS) throw new Error('fila_cheia');
  const id = crypto.randomUUID();
  const item: ItemFila = {
    id,
    dono,
    args: {
      p_id: id,
      p_valor_centavos: args.p_valor_centavos,
      p_categoria_id: args.p_categoria_id,
      p_forma_id: args.p_forma_id,
      p_parcelas: args.p_parcelas,
      p_data: args.p_data,
      p_descricao: args.p_descricao,
    },
    exibicao: { ...exibicao },
    criadoEm: Date.now(),
    situacao: 'aguardando',
  };
  await gravarItem(item);
  emitir({ tipo: 'mudou' });
  return item;
}

async function listar(): Promise<ItemFila[]> {
  const dono = await donoAtual();
  return dono ? (await lerTodos()).filter((i) => i.dono === dono) : [];
}

/** Único caminho que apaga sem envio: exige confirmação explícita e só do próprio dono. */
async function descartar(id: string, opcoes: { confirmado: true }): Promise<void> {
  if (opcoes?.confirmado !== true) throw new Error('descarte_sem_confirmacao');
  const item = await lerItem(id);
  if (!item) return;
  if (item.dono !== (await donoAtual())) throw new Error('item_de_outro_membro');
  await removerItem(id);
  emitir({ tipo: 'mudou' });
}

function assinar(ouvinte: (evento: EventoFila) => void): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export const fila = { enfileirar, esvaziar, listar, descartar, assinar };
