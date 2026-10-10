import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CampoValor } from '../../src/componentes/base/CampoValor';
import { SpriteIcones } from '../../src/componentes/base/SpriteIcones';
import '../../src/estilo/tokens.css';
import '../../src/estilo/global.css';
import './formulario.css';

function Vitrine() {
  const [normal, setNormal] = useState(0);
  const [comErro, setComErro] = useState(0);
  const [comAjuda, setComAjuda] = useState(15000);

  return (
    <>
      <SpriteIcones />
      <main className="vitrine">
        <h1>Campo de valor</h1>
        <div className="formulario">
          <div data-testid="normal">
            <CampoValor centavos={normal} aoMudar={setNormal} />
          </div>
          <div data-testid="erro">
            <CampoValor
              centavos={comErro}
              aoMudar={setComErro}
              rotulo="Valor pago"
              erro="Informe um valor maior que zero."
            />
          </div>
          <div data-testid="ajuda">
            <CampoValor centavos={comAjuda} aoMudar={setComAjuda} rotulo="Saldo inicial" ajuda="Valor de cada mês" />
          </div>
          <div data-testid="desabilitado">
            <CampoValor centavos={4590} aoMudar={() => {}} rotulo="Valor travado" desabilitado />
          </div>
        </div>
      </main>
    </>
  );
}

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('elemento #raiz ausente');
createRoot(raiz).render(<Vitrine />);
