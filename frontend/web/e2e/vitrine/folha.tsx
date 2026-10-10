import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Botao } from '../../src/componentes/base/Botao';
import { Folha } from '../../src/componentes/base/Folha';
import { SpriteIcones } from '../../src/componentes/base/SpriteIcones';
import '../../src/estilo/tokens.css';
import '../../src/estilo/global.css';

function Vitrine() {
  const [aberta, setAberta] = useState(false);
  const montadaOculta = new URLSearchParams(window.location.search).has('oculta');
  return (
    <main>
      <h1>Vitrine da Folha</h1>
      <Botao variante="secundario" onClick={() => setAberta(true)}>
        Abrir folha
      </Botao>
      <Folha
        aberta={aberta}
        aoFechar={() => setAberta(false)}
        titulo="Marcar como paga"
        montadaOculta={montadaOculta}
        rodape={
          <Botao variante="principal" bloco>
            Confirmar pagamento
          </Botao>
        }
      >
        <p>Internet · Contas da casa · venceu 05/10</p>
        <label>
          Valor pago
          <input inputMode="numeric" defaultValue="R$ 119,90" />
        </label>
      </Folha>
    </main>
  );
}

createRoot(document.getElementById('raiz')!).render(
  <>
    <SpriteIcones />
    <Vitrine />
  </>,
);
