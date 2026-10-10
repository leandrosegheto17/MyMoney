import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import '../../src/estilo/tokens.css';
import '../../src/estilo/global.css';
import { SpriteIcones } from '../../src/componentes/base/SpriteIcones';
import { BarraNavegacao } from '../../src/componentes/BarraNavegacao';
import { TrilhoNavegacao } from '../../src/componentes/TrilhoNavegacao';

const raiz = document.getElementById('raiz');
if (raiz === null) throw new Error('Elemento #raiz ausente');

createRoot(raiz).render(
  <StrictMode>
    <MemoryRouter initialEntries={['/lancamentos']}>
      <SpriteIcones />
      <TrilhoNavegacao aoLancar={() => undefined} />
      <BarraNavegacao aoLancar={() => undefined} />
    </MemoryRouter>
  </StrictMode>,
);
