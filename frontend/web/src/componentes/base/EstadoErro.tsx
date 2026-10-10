import { Botao } from './Botao';
import { Icone } from './Icone';
import estilos from './Estado.module.css';

interface Props {
  titulo?: string;
  texto?: string;
  aoTentarDeNovo: () => void;
}

/** Texto fixo: nunca a mensagem crua do servidor. */
export function EstadoErro({
  titulo = 'Não foi possível carregar',
  texto = 'Verifique a conexão e tente de novo.',
  aoTentarDeNovo,
}: Props) {
  return (
    <section className={`${estilos.estado} ${estilos['estado-erro']}`} role="alert">
      <Icone nome="offline" />
      <h2>{titulo}</h2>
      <p>{texto}</p>
      <Botao variante="secundario" icone="recarregar" onClick={aoTentarDeNovo}>
        Tentar de novo
      </Botao>
    </section>
  );
}
