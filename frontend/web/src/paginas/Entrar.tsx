import { FormularioEntrar } from '../componentes/FormularioEntrar';
import { useAviso } from '../componentes/base/useAviso';
import { useEntrar } from '../ganchos/useEntrar';
import { usePedirRedefinicao } from '../ganchos/usePedirRedefinicao';

const MENSAGEM_NEUTRA = 'Se o e-mail for de um membro, você vai receber um link.';

/** A guarda da rota leva a `/` quando a sessão muda; a página só envia as credenciais. */
export function Entrar() {
  const entrar = useEntrar();
  const redefinicao = usePedirRedefinicao();
  const { mostrar } = useAviso();

  function pedirLink(email: string) {
    redefinicao.mutate(email, {
      onSuccess: () => mostrar('sucesso', MENSAGEM_NEUTRA),
      onError: (erro) => mostrar('erro', erro.tipo === 'rede' ? 'Sem conexão.' : 'Servidor indisponível. Tente de novo em instantes.'),
    });
  }

  return (
    <FormularioEntrar
      aoEntrar={(email, senha) => entrar.mutateAsync({ email, senha })}
      aoEsqueci={pedirLink}
      ocupado={entrar.isPending}
      erro={entrar.error}
    />
  );
}
