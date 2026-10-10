import { useNavigate } from 'react-router';
import { FormularioNovaSenha } from '../componentes/FormularioNovaSenha';
import { useAviso } from '../componentes/base/useAviso';
import type { ErroDados } from '../dados/erros';
import { useRecuperacaoSenha } from '../ganchos/useRecuperacaoSenha';
import { useSalvarNovaSenha } from '../ganchos/useSalvarNovaSenha';
import { TEXTO_SEM_CONEXAO, TEXTO_SERVIDOR_INDISPONIVEL } from '../rotulos/textosConexao';

const LINK_EXPIRADO = 'Este link expirou. Peça outro em Entrar, em Esqueci minha senha.';

function textoErroTopo(erro: ErroDados | null, linkExpirado: boolean): string | undefined {
  if (linkExpirado || (erro?.tipo === 'regra' && erro.codigo === 'link_expirado')) return LINK_EXPIRADO;
  if (!erro || (erro.tipo === 'regra' && erro.codigo === 'senha_fraca')) return undefined;
  if (erro.tipo === 'rede') return TEXTO_SEM_CONEXAO;
  if (erro.tipo === 'indisponivel') return TEXTO_SERVIDOR_INDISPONIVEL;
  return 'Não foi possível salvar a senha. Tente de novo.';
}

/** Página do link de redefinição: o Auth entrega a sessão de recuperação; aqui só se escolhe a nova senha. */
export function RedefinirSenha() {
  const recuperacao = useRecuperacaoSenha();
  const salvar = useSalvarNovaSenha();
  const { mostrar } = useAviso();
  const navegar = useNavigate();

  function aoSalvar(senha: string) {
    salvar.mutate(senha, {
      onSuccess: () => {
        mostrar('sucesso', 'Senha alterada. Entre com a nova senha.');
        navegar('/entrar', { replace: true });
      },
    });
  }

  const senhaFraca = salvar.error?.tipo === 'regra' && salvar.error.codigo === 'senha_fraca';

  return (
    <FormularioNovaSenha
      aoSalvar={aoSalvar}
      ocupado={salvar.isPending}
      erroTopo={textoErroTopo(salvar.error, recuperacao.data === 'expirado')}
      erroSenhaServidor={senhaFraca ? 'Use pelo menos 12 caracteres.' : undefined}
    />
  );
}
