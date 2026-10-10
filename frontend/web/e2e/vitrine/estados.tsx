import { createRoot } from 'react-dom/client';
import { CarregandoComAtraso } from '../../src/componentes/base/CarregandoComAtraso';
import { Esqueleto } from '../../src/componentes/base/Esqueleto';
import { EstadoErro } from '../../src/componentes/base/EstadoErro';
import { EstadoVazio } from '../../src/componentes/base/EstadoVazio';
import { LinhaVazia } from '../../src/componentes/base/LinhaVazia';
import { SpriteIcones } from '../../src/componentes/base/SpriteIcones';
import '../../src/estilo/tokens.css';
import '../../src/estilo/global.css';

function Vitrine() {
  return (
    <>
      <SpriteIcones />
      <main className="vitrine">
        <h1>Estados</h1>
        <EstadoVazio icone="lista" titulo="Nenhum lançamento" texto="Registre o primeiro lançamento." />
        <LinhaVazia>Nenhuma meta cadastrada</LinhaVazia>
        <EstadoErro aoTentarDeNovo={() => undefined} />
        <CarregandoComAtraso atrasoMs={0}>
          <Esqueleto variante="titulo" />
          <Esqueleto variante="valor" />
          <Esqueleto variante="linha" />
          <Esqueleto variante="linha-curta" />
          <Esqueleto variante="bloco-titulo" />
        </CarregandoComAtraso>
      </main>
    </>
  );
}

createRoot(document.getElementById('raiz') as HTMLElement).render(<Vitrine />);
