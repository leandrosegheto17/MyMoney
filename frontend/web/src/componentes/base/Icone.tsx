export type NomeIcone =
  | 'adicionar'
  | 'ajustes'
  | 'alerta'
  | 'alvo'
  | 'aviso'
  | 'baixo'
  | 'banco'
  | 'busca'
  | 'calendario'
  | 'cartao'
  | 'casa'
  | 'compartilhar'
  | 'dir'
  | 'editar'
  | 'envio'
  | 'esq'
  | 'estrela'
  | 'fechar'
  | 'grafico'
  | 'lista'
  | 'lixo'
  | 'mais'
  | 'marcado'
  | 'offline'
  | 'ok'
  | 'olho'
  | 'pessoa'
  | 'recarregar'
  | 'relogio'
  | 'sair';

interface Props {
  nome: NomeIcone;
}

/** Ícone decorativo: o significado vai no rótulo do botão, não no <svg>. */
export function Icone({ nome }: Props) {
  return (
    <svg className="icone" aria-hidden="true">
      <use href={`#i-${nome}`} />
    </svg>
  );
}
