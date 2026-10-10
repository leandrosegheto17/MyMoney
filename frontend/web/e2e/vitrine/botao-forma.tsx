import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BotaoForma } from '../../src/componentes/base/BotaoForma';
import { SpriteIcones } from '../../src/componentes/base/SpriteIcones';
import dados from '../../../../.md/mockup/respostas/dados-lancamento.json';
import '../../src/estilo/tokens.css';
import '../../src/estilo/global.css';
import './formulario.css';

// A vitrine só exercita o componente: o texto do tipo vem do chamador (T03/T08 usam rotulos/).
const TIPO: Record<string, string> = { pix: 'Pix', debito: 'Débito', credito: 'Crédito' };
const formas = dados.formas.map((f) => ({ id: f.id, nome: f.nome, detalhe: TIPO[f.tipo] }));
const contas = dados.contas.map((c) => ({ id: c.id, nome: c.nome }));

function Vitrine() {
  const [forma, setForma] = useState(dados.forma_padrao_id);
  const [conta, setConta] = useState(dados.conta_receita_padrao_id);

  return (
    <>
      <SpriteIcones />
      <main className="vitrine">
        <h1>Botão de forma</h1>
        <div className="formulario">
          <div data-testid="forma">
            <BotaoForma
              rotulo="Forma de pagamento"
              opcoes={formas}
              valor={forma}
              aoEscolher={setForma}
              ajuda="A conta da forma é a que sai o dinheiro."
            />
          </div>
          <div data-testid="conta">
            <BotaoForma id="conta" rotulo="Conta de destino" opcoes={contas} valor={conta} aoEscolher={setConta} />
          </div>
          <button type="button">Depois</button>
        </div>
      </main>
    </>
  );
}

createRoot(document.getElementById('raiz') as HTMLElement).render(<Vitrine />);
