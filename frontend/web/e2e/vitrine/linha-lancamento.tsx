import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { LinhaLancamento } from '../../src/componentes/LinhaLancamento';
import { SpriteIcones } from '../../src/componentes/base/SpriteIcones';
import { formatarTituloLancamento } from '../../src/formatacao/lancamento';
import '../../src/estilo/tokens.css';
import '../../src/estilo/global.css';
import './formulario.css';

const href = (n: number) => `/lancamentos/00000000-0000-4000-8000-0000000005${n}`;

function Vitrine() {
  return (
    <>
      <SpriteIcones />
      <main className="vitrine">
        <h1>Linhas de lançamento</h1>
        <BrowserRouter>
          <section aria-label="Lançamentos">
            <LinhaLancamento
              href={href(15)}
              escopo="individual"
              titulo={formatarTituloLancamento('Fone bluetooth', 'Lazer pessoal', 2, 3)}
              categoria="Lazer pessoal"
              variavel
              tipo="despesa"
              valorCentavos={8000}
              data="2026-10-10"
              pagador={{ nome: 'Leandro', souEu: true }}
            />
            <LinhaLancamento
              href={href(40)}
              escopo="conjunto"
              titulo={formatarTituloLancamento(null, 'Mercado', 1, 1)}
              categoria="Mercado"
              variavel
              tipo="despesa"
              valorCentavos={4590}
              data="2026-10-12"
              pagador={{ nome: 'Ana', souEu: false }}
            />
            <LinhaLancamento
              href={href(41)}
              escopo="individual"
              titulo="Salário"
              categoria="Salário"
              variavel={false}
              tipo="receita"
              valorCentavos={750000}
              data="2026-10-05"
              pagador={{ nome: 'Leandro', souEu: true }}
            />
            <LinhaLancamento
              href={href(42)}
              escopo="individual"
              titulo="Padaria"
              categoria="Almoço/Alimentação fora"
              variavel={false}
              tipo="despesa"
              valorCentavos={1250}
              data="2026-10-09"
              pagador={{ nome: 'Leandro', souEu: true }}
              aguardando
            />
          </section>
        </BrowserRouter>
      </main>
    </>
  );
}

createRoot(document.getElementById('raiz') as HTMLElement).render(<Vitrine />);
