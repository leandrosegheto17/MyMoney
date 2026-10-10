import { createRoot } from 'react-dom/client';
import { Botao } from '../../src/componentes/base/Botao';
import { Faixa } from '../../src/componentes/base/Faixa';
import { RegiaoAvisos } from '../../src/componentes/base/RegiaoAvisos';
import { SpriteIcones } from '../../src/componentes/base/SpriteIcones';
import { useAviso } from '../../src/componentes/base/useAviso';
import '../../src/estilo/tokens.css';
import '../../src/estilo/global.css';
import './formulario.css';

function Disparadores() {
  const { mostrar } = useAviso();
  return (
    <div className="acoes-formulario">
      <Botao variante="secundario" onClick={() => mostrar('sucesso', 'Lançamento salvo')}>
        Sucesso
      </Botao>
      <Botao variante="secundario" onClick={() => mostrar('guardado', 'Guardado no aparelho')}>
        Guardado
      </Botao>
      <Botao variante="secundario" onClick={() => mostrar('erro', 'Não foi possível salvar')}>
        Erro
      </Botao>
    </div>
  );
}

function Vitrine() {
  return (
    <RegiaoAvisos>
      <SpriteIcones />
      <main className="vitrine">
        <h1>Aviso e Faixa</h1>
        <div className="formulario" data-testid="faixas">
          <Faixa variante="offline">Sem conexão. Os lançamentos ficam guardados no aparelho.</Faixa>
          <Faixa variante="pendentes" acoes={<a href="#pendentes">Ver</a>}>
            1 lançamento aguardando envio.
          </Faixa>
          <Faixa
            variante="instalar"
            acoes={
              <>
                <Botao variante="principal">Instalar</Botao>
                <Botao variante="texto">Dispensar</Botao>
              </>
            }
          >
            Instale o MyMoney para lançar mais rápido.
          </Faixa>
          <Faixa variante="cache" hora="14:32" />
        </div>
        <Disparadores />
      </main>
    </RegiaoAvisos>
  );
}

createRoot(document.getElementById('raiz') as HTMLElement).render(<Vitrine />);
