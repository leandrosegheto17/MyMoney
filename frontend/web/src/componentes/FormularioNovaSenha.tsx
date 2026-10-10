import { useEffect, useRef, useState } from 'react';
import { AvisoErroTopo } from './base/AvisoErroTopo';
import { Botao } from './base/Botao';
import { CampoTexto } from './base/CampoTexto';
import { LinkMais } from './base/LinkMais';
import { CartaoAcesso } from './CartaoAcesso';

interface Props {
  aoSalvar: (senha: string) => void;
  ocupado: boolean;
  /** Texto do erro do envio inteiro (link vencido, sem conexão…), mostrado acima dos campos. */
  erroTopo?: string;
  /** Erro de senha recusada pelo servidor, mostrado no campo da senha. */
  erroSenhaServidor?: string;
}

const TAMANHO_MINIMO = 12;
const REGRA = `Pelo menos ${TAMANHO_MINIMO} caracteres.`;
const ERRO_CURTA = `Use pelo menos ${TAMANHO_MINIMO} caracteres.`;
const ERRO_CONFERE = 'As senhas não conferem.';

interface Erros {
  senha?: string;
  confirma?: string;
}

export function FormularioNovaSenha({ aoSalvar, ocupado, erroTopo, erroSenhaServidor }: Props) {
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [tentativa, setTentativa] = useState(0);
  const campoSenha = useRef<HTMLInputElement>(null);
  const campoConfirma = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tentativa === 0) return;
    (erros.senha ? campoSenha : erros.confirma ? campoConfirma : null)?.current?.focus();
    // Só reage a uma nova tentativa de envio, não à digitação.
  }, [tentativa]);

  function enviar() {
    if (ocupado) return;
    const novos: Erros = {};
    if (senha.length < TAMANHO_MINIMO) novos.senha = ERRO_CURTA;
    if (confirma !== senha) novos.confirma = ERRO_CONFERE;
    setErros(novos);
    if (novos.senha || novos.confirma) {
      setTentativa((n) => n + 1);
      return;
    }
    aoSalvar(senha);
  }

  const erroSenha = erros.senha ?? erroSenhaServidor;

  return (
    <CartaoAcesso titulo="Nova senha" nomeFormulario="Redefinir senha" aoEnviar={enviar} ocupado={ocupado}>
      {erroTopo ? <AvisoErroTopo>{erroTopo}</AvisoErroTopo> : null}
      <CampoTexto
        ref={campoSenha}
        rotulo="Nova senha"
        type="password"
        autoComplete="new-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        ajuda={erroSenha ? undefined : REGRA}
        erro={erroSenha}
      />
      <CampoTexto
        ref={campoConfirma}
        rotulo="Repita a nova senha"
        type="password"
        autoComplete="new-password"
        value={confirma}
        onChange={(e) => setConfirma(e.target.value)}
        erro={erros.confirma}
      />
      <Botao variante="principal" bloco tipo="submit" salvando={ocupado}>
        Salvar senha
      </Botao>
      <LinkMais centralizado para="/entrar">
        Voltar para Entrar
      </LinkMais>
    </CartaoAcesso>
  );
}
