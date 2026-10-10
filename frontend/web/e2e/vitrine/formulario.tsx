import { useRef, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { Botao } from '../../src/componentes/base/Botao';
import { CampoData } from '../../src/componentes/base/CampoData';
import { CampoTexto } from '../../src/componentes/base/CampoTexto';
import { focarPrimeiroErro } from '../../src/componentes/base/focarPrimeiroErro';
import { Interruptor } from '../../src/componentes/base/Interruptor';
import { Selecao } from '../../src/componentes/base/Selecao';
import { SpriteIcones } from '../../src/componentes/base/SpriteIcones';
import '../../src/estilo/tokens.css';
import '../../src/estilo/global.css';
import './formulario.css';

const contas = [
  { valor: 'nubank', rotulo: 'Nubank' },
  { valor: 'itau', rotulo: 'Itaú' },
];

function Vitrine() {
  const formulario = useRef<HTMLFormElement>(null);
  const [nome, setNome] = useState('');
  const [conta, setConta] = useState('nubank');
  const [data, setData] = useState('2026-10-09');
  const [variavel, setVariavel] = useState(false);
  const [erros, setErros] = useState<{ nome?: string; data?: string }>({});
  const [salvando, setSalvando] = useState(false);
  const [envios, setEnvios] = useState(0);

  function aoEnviar(e: FormEvent) {
    e.preventDefault();
    const novos = { nome: nome ? undefined : 'Informe o nome.', data: data ? undefined : 'Informe a data.' };
    setErros(novos);
    if (novos.nome || novos.data) {
      // Os erros só chegam ao DOM no próximo render; o foco vai depois dele.
      queueMicrotask(() => formulario.current && focarPrimeiroErro(formulario.current));
      return;
    }
    setEnvios((n) => n + 1);
    setSalvando(true);
  }

  return (
    <>
      <SpriteIcones />
      <main className="vitrine">
        <h1>Nova conta</h1>
        <form ref={formulario} className="formulario" noValidate aria-busy={salvando} onSubmit={aoEnviar}>
          <CampoTexto
            rotulo="Nome"
            ajuda="Como aparece na lista"
            autoComplete="off"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            erro={erros.nome}
          />
          <Selecao rotulo="Conta" opcoes={contas} value={conta} onChange={(e) => setConta(e.target.value)} />
          <CampoData rotulo="Data" value={data} onChange={(e) => setData(e.target.value)} erro={erros.data} />
          <Interruptor
            rotulo="Despesa variável"
            ajuda="Entra no orçamento como variável"
            checked={variavel}
            onChange={(e) => setVariavel(e.target.checked)}
          />
          <div className="acoes-formulario">
            <Botao variante="principal" tipo="submit" salvando={salvando}>
              Salvar
            </Botao>
          </div>
        </form>
        <p data-testid="envios">{envios}</p>
      </main>
    </>
  );
}

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('elemento #raiz ausente');
createRoot(raiz).render(<Vitrine />);
